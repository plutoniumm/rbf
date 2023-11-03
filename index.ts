import { GITHUB_PAT } from "./env.js";

function parseRepo (repo: string): string {
  repo = repo.replace(/^@/, "");
  const [owner, name] = repo.split("/");

  return `owner: "${owner}", name: "${name}"`;
};
const span = new Date(Date.now() - 2 * 365 * 864e5).toISOString();
const rand = () => Math.abs(Math.random() * 10e2 | 0);
const query = (repo, time = span) =>/*GraphQL*/`
r${rand()}: repository(${parseRepo(repo)}) {
  defaultBranchRef {
    target {
      ... on Commit {
        history(since: "${time}") {
          edges{
            node {
                author { user { name, login } }
                additions
                deletions
              }
            }
          }
        }
      }
    }
  }`;

type Contributors = {
  login: string;
  name: string;
  diff: number;
};

function parseKey (node) {
  const target = node.defaultBranchRef.target;
  const edges = target.history.edges;

  let total_diffs = 0;
  let contributors: Contributors[] = [];
  const len = edges.length;

  for (let i = 0; i < len; i++) {
    const node = edges[i].node;
    const { author, additions, deletions } = node;
    if (!author) continue;
    const { login, name } = author.user;

    const index = contributors.findIndex((c) => c.login === login);
    const diff = additions + deletions;
    total_diffs += diff;
    if (index === -1) {
      contributors.push({
        name: name || login,
        login, diff
      });
    } else {
      contributors[index].diff += diff;
    }
  };
  contributors.sort((a, b) => b.diff - a.diff);

  const names: string[] = [];
  const logins: string[] = [];
  const diffs: number[] = [];
  let sum = 0;
  for (let i = 0; i < contributors.length; i++) {
    const { name, login, diff } = contributors[i];
    names.push(name);
    logins.push(login);
    diffs.push(diff);
    sum += diff;

    if (sum > total_diffs * 0.68) break;
  };

  const contributors68 = new Array(names.length)
    .fill(0)
    .map((_, i) => ({
      name: names[i],
      login: logins[i],
      diff: Math.round(diffs[i] * 100 / total_diffs) + "%"
    }));

  return {
    contributors: contributors68,
    total_diffs,
    total_devs: contributors.length,
  };
};

async function getRepos (repos: string, APIkey: string) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `bearer ${APIkey || GITHUB_PAT}`,
    },
    body: JSON.stringify({
      query: `{
      ${repos.map((repo) => query(repo)).join(",\n")}
    }`,
    })
  }).then((res) => res.json());

  const keys = Object.keys(res.data);
  const parsed = keys.map((key) => parseKey(res.data[key]));

  return JSON.stringify({
    repos: keys.map((key, i) => {
      const { contributors, total_diffs, total_devs } = parsed[i];
      return {
        repo: repos[i],
        contributors,
        total_diffs,
        total_devs,
      };
    })
  });
};

// worker code
self.onmessage = async (e) => {
  const { repos, APIkey } = e.data;
  const save = await getRepos(repos, APIkey);
  self.postMessage(save);
};