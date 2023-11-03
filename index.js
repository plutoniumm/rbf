/** @param {string} repo
 * @returns {string}
 */
function parseRepo ( repo ) {
    repo = repo.replace( /^@/, "" );
    const [ owner, name ] = repo.split( "/" );

    return `owner: "${ owner }", name: "${ name }"`;
}
;
const span = new Date( Date.now() - 2 * 365 * 864e5 ).toISOString();
/** @returns {number} */
const rand = () => Math.abs( Math.random() * 10e2 | 0 );
/** @returns {string} */
const query = ( repo, time = span ) => /*GraphQL*/ `
r${ rand() }: repository(${ parseRepo( repo ) }) {
  defaultBranchRef {
    target {
      ... on Commit {
        history(since: "${ time }") {
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

/** @returns {{ contributors: { name: string; login: string; diff: string; }[]; total_diffs: number; total_devs: number; }} */
function parseKey ( node ) {
    const target = node.defaultBranchRef.target;
    const edges = target.history.edges;

    let total_diffs = 0;
    let contributors = [];
    const len = edges.length;

    for ( let i = 0;i < len;i++ ) {
        const node = edges[ i ].node;
        const { author, additions, deletions } = node;
        if ( !author )
            continue;
        const { login, name } = author.user;

        const index = contributors.findIndex( ( c ) => c.login === login );
        const diff = additions + deletions;
        total_diffs += diff;
        if ( index === -1 ) {
            contributors.push( {
                name: name || login,
                login, diff
            } );
        }
        else {
            contributors[ index ].diff += diff;
        }
    }
    ;
    contributors.sort( ( a, b ) => b.diff - a.diff );

    const names = [];
    const logins = [];
    const diffs = [];
    let sum = 0;
    for ( let i = 0;i < contributors.length;i++ ) {
        const { name, login, diff } = contributors[ i ];
        names.push( name );
        logins.push( login );
        diffs.push( diff );
        sum += diff;

        if ( sum > total_diffs * 0.68 )
            break;
    }
    ;

    const contributors68 = new Array( names.length )
        .fill( 0 )
        .map( ( _, i ) => ( {
            name: names[ i ],
            login: logins[ i ],
            diff: Math.round( diffs[ i ] * 100 / total_diffs ) + "%"
        } ) );

    return {
        contributors: contributors68,
        total_diffs,
        total_devs: contributors.length,
    };
}
;

/** @param {string} repos
 * @param {string} APIkey
 * @returns {Promise<string>}
 */
async function getRepos ( repos, APIkey ) {
    const res = await fetch( "https://api.github.com/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `bearer ${ APIkey || GITHUB_PAT }`,
        },
        body: JSON.stringify( {
            query: `{
      ${ repos.map( ( repo ) => query( repo ) ).join( ",\n" ) }
    }`,
        } )
    } ).then( ( res ) => res.json() );

    const keys = Object.keys( res.data );
    const parsed = keys.map( ( key ) => parseKey( res.data[ key ] ) );

    return JSON.stringify( {
        repos: keys.map( ( key, i ) => {
            const { contributors, total_diffs, total_devs } = parsed[ i ];
            return {
                repo: repos[ i ],
                contributors,
                total_diffs,
                total_devs,
            };
        } )
    } );
};

const demo = `{"repos":[{"repo":"facebook/react","contributors":[{"name":"Josh Story","login":"gnoff","diff":"52%"},{"name":"Sebastian Markbåge","login":"sebmarkbage","diff":"16%"}],"total_diffs":26497,"total_devs":21},{"repo":"microsoft/typescript","contributors":[{"name":"Sheetal Nandi","login":"sheetalkamat","diff":"92%"}],"total_diffs":313391,"total_devs":19}]}`;

// worker code
self.onmessage = async ( e ) => {
    const { repos, APIkey } = e.data;

    console.log( repos, APIkey );
    // const save = await getRepos( repos, APIkey );
    // self.postMessage( save );
    self.postMessage( demo );
};

/** @typedef {Object} Contributors
 * @property {string} login
 * @property {string} name
 * @property {number} diff
 */
