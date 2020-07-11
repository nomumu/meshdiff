import {clearScene,spawnBeforeSTL,spawnAfterSTL} from './STLDiff.js'

let target_dir = "./target/crane_x7_ros.git/";
let branch_name = "master"

let index_head = new String("");
let index_version;
let index_entries_num;
let index_entries;
let log_lines;
let commit_list = [];

const padding_size = 8;
const entry_type_file   = "100644";
const entry_type_exec   = "100755";
const entry_type_link   = "120000";
const entry_type_dir    = "40000";
const entry_type_submod = "160000";

init();

/**
 * Parse tree data function
 * @param tree_array: tree data(array buffer)
 * @return { type, name, hash }
 */
function parse_tree( tree_array ) {
    var head_string = String.fromCharCode(tree_array[0]) + String.fromCharCode(tree_array[1]) + String.fromCharCode(tree_array[2]) + String.fromCharCode(tree_array[3]);
    var debug = (new TextDecoder).decode(tree_array.slice(5)).split("\0");
    var entry_count = parseInt((new TextDecoder).decode(tree_array.slice(5)).split("\0")[0] );

    // Entries
    let entry_head_len = tree_array.indexOf( 0 ) - tree_array.indexOf( " " );
    var entry_top = entry_head_len;
    var hash_list   = [];
    while( entry_top < entry_count ) {
        var entry_array = tree_array.slice( entry_top, entry_head_len+entry_count );
        var entry_str   = (new TextDecoder).decode(entry_array);
        var entry_info  = entry_str.split(" ");
        var entry_type  = entry_info[0];
        var separator   = entry_array.slice(entry_type.length + 1).indexOf( 0 ) + entry_type.length + 1;
        var entry_name  = (new TextDecoder).decode( entry_array.slice(entry_type.length + 1, separator) );

        var hash_top = entry_array.indexOf(0) + 1;
        var hash_str = "";
        for( var index=0 ; index<20 ; ++index ) {
            var value = entry_array[ index+hash_top ];
            var string = ('00' + value.toString(16) ).slice( -2 );
            hash_str += string;
        }
        hash_list.push( { type: entry_type, name: entry_name, hash: hash_str } );
        hash_top += 20;
        entry_top += hash_top;
    }
    return hash_list;
}

/**
 * Parse index entries function
 * @param entries: index entries data(array buffer)
 * @return { name, hash, len }
 */
function parse_entries( entries ) {
    var result = 0;
    var index = 0;

    var ctime_sec  = (entries[0]*24) + (entries[1]*16) + (entries[2]*8) + (entries[3]);
    var ctime_nsec = (entries[4]*24) + (entries[5]*16) + (entries[6]*8) + (entries[7]);
    var mtime_sec  = (entries[8]*24) + (entries[9]*16) + (entries[10]*8) + (entries[11]);
    var mtime_nsec = (entries[12]*24) + (entries[13]*16) + (entries[14]*8) + (entries[15]);

    var dev   = (entries[16]*24) + (entries[17]*16) + (entries[18]*8) + (entries[19]);
    var ino   = (entries[20]*24) + (entries[21]*16) + (entries[22]*8) + (entries[23]);
    var mode  = (entries[24]*24) + (entries[25]*16) + (entries[26]*8) + (entries[27]);
    var uid   = (entries[28]*24) + (entries[29]*16) + (entries[30]*8) + (entries[31]);
    var gid   = (entries[32]*24) + (entries[33]*16) + (entries[34]*8) + (entries[35]);

    var fsize = (entries[36]*24) + (entries[37]*16) + (entries[38]*8) + (entries[39]);

    var hash_str = "";
    for( var index=0 ; index<20 ; ++index ) {
        var value = entries[ index+40 ];
        var string = ('00' + value.toString(16) ).slice( -2 );
        hash_str += string;
    }

    var fname_len = ((entries[60]*8) + (entries[61])) & 0x3FF;
    var fname     = (new TextDecoder).decode( entries.slice(62,(62+fname_len)) );
    var padlen = padding_size - ((62 + fname_len) % padding_size);

    return { name: fname, hash: hash_str, len: (62 + fname_len + padlen) };
}

/**
 * Parse git index function
 * @param index_array: index data array 
 */
function parse_index( index_array ) {
    // format:  https://github.com/git/git/blob/master/Documentation/technical/index-format.txt

    // Decode header
    index_head = String.fromCharCode(index_array[0]) + String.fromCharCode(index_array[1]) + String.fromCharCode(index_array[2]) + String.fromCharCode(index_array[3]);
    index_version = (index_array[4]*1000) + (index_array[5]*100) + (index_array[6]*10) + (index_array[7]);
    index_entries_num = (index_array[8]*24) + (index_array[9]*16) + (index_array[10]*8) + (index_array[11]);

    // Decode entries
    var head = 12;
    index_entries = [];
    for( var index=0 ; index<index_entries_num ; ++index ) {
        var entries = index_array.slice(head);
        var result = parse_entries( entries );
        
        var filetype = result.name.slice( (result.name.length-4), (result.name.length) );
        if( filetype == ".stl" ) {
            index_entries.push( { name: result.name, hash: result.hash } );
        }
        head += result.len;
    }
    createGitList();
}

/**
 * Initialize function
 */
function init() {
    document.getElementById( "FileList" ).addEventListener('change', callbackLoadList );
    document.getElementById( "beforeRevList" ).addEventListener('click', callbackChangeModel );
    document.getElementById( "afterRevList" ).addEventListener('click', callbackChangeModel );
    document.getElementById( "Initialize" ).addEventListener('click', callbackInitialize );
    document.getElementById( "ScaleSelect" ).addEventListener('change', callbackChangeModel );
    document.getElementById( "SaveSTL" ).addEventListener('click', callbackSaveSTL );
}

/**
 * Callback initial load button.
 * @param none
 */
function callbackInitialize() {
    document.body.style.cursor = 'wait';
    var status_element = document.getElementById("LoadStatus");
    status_element.innerText = "ロード中...";
    var targetname_element = document.getElementById("TargetName");
    target_dir = "./target/" + targetname_element.value + "/";
    var branchname_element = document.getElementById("BranchName");
    branch_name = branchname_element.value;
    loadGitRefs();
}

/**
 * Create git log list from index.
 * @param none
 * @note not use
 */
function createGitList() {
    var flist = document.querySelector( "#FileList" );
    for( let index in index_entries ) {
        var option = document.createElement( "option" );
        option.text = "./" + index_entries[index].name;
        option.value = index_entries[index].hash;
        flist.appendChild( option );
    }
}

/**
 * Clear list element.
 * @param id: List element ID
 */
function clearList( id ) {
    var tmp = document.getElementById( id );
    for( let index=tmp.options.length ; index>=0 ; --index ) {
        tmp.options[index] = null;
    }
}

/**
 * Search file hash from commit tree.
 * @param id: list element ID
 * @return file hash
 */
function searchCommitTree( commit, fname ) {
    let result = "";
    for( let index in commit.tree ) {
        if( commit.tree[index].path == fname ) {
            result =  commit.tree[index].hash;
            break;
        }
    }
    return result;
}

/**
 * Create rev list data.
 * @param id: list element
 * @param list: commit log list
 * @param fname: file name
 */
function createRevList( id, list, fname ) {
    let list_element = document.getElementById( id );
    clearList( id );
    let revHist = [];
    for( let index in list ) {
        var fhash = searchCommitTree( list[index], fname );
        if( fhash != "" ) {
            if( (revHist.length > 0) && (revHist[revHist.length-1].fhash == fhash) ) {
                continue;
            }
            var revText = " ["
            + list[index].date.getFullYear() + "/"
            + (list[index].date.getMonth()+1) + "/"
            + list[index].date.getDate() + " - "
            + list[index].committer + "]";
            revHist.push( { text: revText, title: list[index].comment, value: list[index].hash, fhash } )
        }
    }
    for( let hist_index in revHist ) {
        var option = document.createElement( "option" );
        option.text = revHist[hist_index].text;
        option.value = revHist[hist_index].value;
        option.title = revHist[hist_index].title;
        if( list_element.length == 0 ) {
            list_element.appendChild( option );
        }else{
            list_element.insertBefore( option, list_element.options[0] );
        }
        list_element.size = revHist.length;
    }
    if( list_element.length > 0 ) {
        list_element.selectedIndex = 0;
    }
}

/**
 * Load git logs from .git/log/HEAD.
 * @param none
 * @note not use
 */
async function loadGitLogs() {
    var loader = new THREE.FileLoader();
    log_lines = [];
    loader.setResponseType( 'text' );
    loader.load( target_dir + 'logs/HEAD', function ( text ) {
        var text_lines = text.split(/\r\n|\r|\n/);
        let parse_line = function( line ) {
            var p, h, n;
            var tmp_line = line.split(" ");
            p = tmp_line[0];
            h = tmp_line[1];
            n = tmp_line[2];
            var c = line.slice( line.indexOf(':')+2 )
            return { parent: p, hash: h, name: n, comment: c };
        };
        for(let index in text_lines ) {
            if( text_lines[index].length > 0 ) {
                var {parent,hash,name,comment} = parse_line( text_lines[index] );
                var isDuplicate = (h) => {
                    for( let check_index in log_lines ) {
                        if( log_lines[check_index].hash == h ) {
                            return true;
                        }
                    }
                    return false;
                }
                if( isDuplicate(hash) ) {
                    continue;
                }
                log_lines.unshift( {parent,hash,name} );
                loadGitObject(hash, "").then( async function(result) {
                    if( result.type == "commit" ) {
                        var lines = result.data.split(/\r\n|\r|\n/);
                        var tree_hash = lines[0].split(" ");
                        var root_path = ".";
                        var res_tree = await loadGitTree( tree_hash[2], root_path, result.hash );
                        let commit_info = parse_commit( result.data, result.hash );
                        commit_list.push( { data: commit_info.date, committer: commit_info.committer, comment: commit_info.comment, hash: commit_info.hash, tree: commit_info.tree } );
                    }else if( result.type == "tree" ) {
                        console.log("get tree");
                    }else if( result.type == "blob" ) {
                        console.log("get blob");
                    }
                })
            }
        }
    } );    
}

/**
 * Load '.git/index' function
 * @param none
 * @note can't use for mirror target.
 */
function loadGitIndex() {
    var loaderArray = new THREE.FileLoader();
    loaderArray.setResponseType( 'arraybuffer' );
    loaderArray.load( target_dir + 'index', function ( text ) {
        var index_array = new Uint8Array( text );
        parse_index( index_array );
        loadGitLogs();
    } );
}

/**
 * Load '.git/packed-ref' function
 * @param none
 * @note for mirror target.
 */
function loadGitRefs() {
    var loaderArray = new THREE.FileLoader();
    loaderArray.setResponseType( 'arraybuffer' );
    loaderArray.load( target_dir + 'packed-refs', function ( text ) {
        let lines = (new TextDecoder).decode(text).split(/\r\n|\r|\n/);
        for( var index=(lines.length-1) ; index>=0 ; --index ) {
            if( (lines[index].length == 0)
                || (lines[index].indexOf('#') == 0)
                || (lines[index].indexOf("pull") > 0) ) {
                    lines.splice( index, 1 );
            }else{
                lines[index] = lines[index].split( " " );
            }
        }
        for( var index in lines ) {
            if( lines[index][1].indexOf(branch_name) > 0 ) {
                loadGitRefTree( lines[index][0] );
                break;
            }
        }
    } );
}

/**
 * Parse commit text function
 * @param text: commit text
 * @return { date, committer, comment, hash, parent, tree }
 */
function parse_commit( text, hash ) {
    var lines = text.split(/\r\n|\r|\n/);
    var parse_separator = function( t ) {
        let result = [];
        for( let index=0 ; index<t.length ; ++index ) {
            if( t[index].length == 0 ) {
                result.push( index );
            }
        }
        return result;
    };
    var separators = parse_separator( lines );
    var comment = "";
    if( separators.length > 0 ) {
        for( let line=separators[0] ; line<lines.length ; ++line ) {
            if( lines[line].length > 0 ) {
                comment += lines[ line ] + "\n";
            }
        }
    }
    var msec;
    var committer;
    for( let line in lines ) {
        var splits = lines[line].split( " " );
        if( splits[0] == "committer" ) {
            msec = splits[ splits.length-2 ] + "000";
            committer = lines[line].slice( (lines[line].indexOf(" ")+1), (lines[line].indexOf("<")-1) );
        }
    }
    var date = new Date( parseInt(msec) );
    var commit_hash = hash;
    var parent_hash = "";
    var tree_hash = "";
    for( let line in lines ) {
        if( lines[line].indexOf("commit") == 0 ) {
            var tmp = lines[line].split(" ");
            for( let idx in tmp ) {
                if( tmp[idx].indexOf("tree") > 0 ) {
                    tree_hash = tmp[parseInt(idx)+1];
                    break;
                }
            }
        }else if( lines[line].indexOf("parent") == 0 ) {
            var tmp = lines[line].split(" ");
            parent_hash = tmp[1];
        }
    }
    return  { date, committer, comment, hash: commit_hash, parent: parent_hash, tree: tree_hash };
}

/**
 * Load git ref commit tree (sub).
 * @param hash: head hash
 */
async function loadGitRefTree( hash ) {
    let result = await subLoadGitRefTree( hash );
    for( let index in result ) {
        var root_path = ".";
        var tree_data = await loadGitTree( result[index].tree, root_path, result[index].hash );
        commit_list.push( { date: result[index].date, committer: result[index].committer, comment: result[index].comment, hash: result[index].tree, tree: tree_data } );
    }

    // create HEAD file list.
    var flist = document.querySelector("#FileList");
    var head_tree = commit_list[commit_list.length-1].tree;
    for( let index in head_tree ) {
        if( head_tree[index].path.indexOf(".stl") > 0 ) {
            var option = document.createElement("option");
            option.text = head_tree[index].path;
            option.value = head_tree[index].hash;
            flist.appendChild( option );
        }
    }
    var status_element = document.getElementById("LoadStatus");
    status_element.innerText = "";
    document.body.style.cursor = 'auto';
}

/**
 * Load git ref commit tree (sub).
 * @param hash: target hash
 * @return array[ { date, committer, comment, hash, parent, tree } ]
 */
function subLoadGitRefTree( hash ) {
    return new Promise( async (resolve,reject) => {
        let result = await loadGitObject( hash , "" );
        if( result.type == "commit" ) {
            let commit_info = parse_commit( result.data, hash );
            let res = [];
            if( (commit_info.parent.length > 0) && (commit_info.parent != "00000000000000000000")  ) {
                var parent_info = await subLoadGitRefTree( commit_info.parent );
                for( let index in parent_info ) {
                    res.push( parent_info[index] );
                }
            }
            res.push( commit_info );
            resolve( res );
        }
    });
}

/**
 * Load git object
 * @param hash: load hash
 * @return { type: blob, data, hash }
 * @return { type: tree, data, hash }
 * @return { type: commit, data, hash }
 * @return { type: unknown, data, hash }
 */
function loadGitObject( hash ) {
    return new Promise((resolve,reject) => {
        var fpath = target_dir + 'objects/' + hash.slice(0,2) + '/' + hash.slice(2);
        var loaderArray = new THREE.FileLoader();
        loaderArray.setResponseType( 'arraybuffer' );
        loaderArray.load( fpath, function ( text ) {
            var compressed = new Uint8Array( text );
            var inflate = new Zlib.InflateStream(compressed);
            var data = inflate.decompress();
            var ftype = (new TextDecoder).decode(data.slice(0,4));
            if( ftype == "blob" ) {
                console.log( fpath );
                let blob_head_len = data.indexOf( 0 );
                var stl_data = data.slice(blob_head_len+1);
                resolve( { type: "blob", data: stl_data.buffer, hash: hash } );
            }else if( ftype == "tree" ) {
                var tree_list = parse_tree( data );
                resolve( { type: "tree", data: tree_list, hash: hash } );
            }else if( ftype == "comm") {
                resolve( { type: "commit", data: (new TextDecoder).decode(data), hash: hash } );
            }else{
                reject( { type: "unknown", data: null, hash: "" } );
            }
        } )
    });
}

/**
 * Load git commit tree.
 * @param hash: tree hash
 * @param path: tree root path
 * @param commit_hash: commit hash
 * @return { path, hash }
 */
async function loadGitTree( hash, path, commit_hash ) {
    return new Promise( async (resolve,reject) => {
        var result = await subLoadGitTree( hash, path );
        resolve( result );
    });
}

/**
 * Load git commit tree (sub).
 * @param tree_hash: tree hash
 * @param path: tree root path
 * @return { full path, hash }
 */
function subLoadGitTree( tree_hash, path ) {
    return new Promise((resolve,reject) => {
        var fpath = target_dir + 'objects/' + tree_hash.slice(0,2) + '/' + tree_hash.slice(2);
        var loaderArray = new THREE.FileLoader();
        loaderArray.setResponseType( 'arraybuffer' );
        loaderArray.load( fpath, async function ( text ) {
            var compressed = new Uint8Array( text );
            var inflate = new Zlib.InflateStream(compressed);
            var data = inflate.decompress();
            var ftype = (new TextDecoder).decode(data.slice(0,4));
            if( ftype == "tree" ) {
                var tree_list = parse_tree( data );
                var result = [];
                for( var index in tree_list ) {
                    if( tree_list[index].type == entry_type_dir ) {
                        var res_tree = await subLoadGitTree( tree_list[index].hash, path + "/" + tree_list[index].name );
                        for( var res_index in res_tree ) {
                            result.push( res_tree[res_index] );
                        }
                    }else if( tree_list[index].type == entry_type_file ) {
                        result.push( { path: path + "/" + tree_list[index].name, hash: tree_list[index].hash } );
                    }
                }
                resolve( result );
            }else{
                reject();
            }
        } )
    });
}

/**
 * Callback file select.
 * @param value: file list information
 */
async function callbackLoadList( value ) {
    let index = value.target.selectedIndex;
    let fname = value.target[index].label;
    createRevList( "beforeRevList", commit_list, fname );
    createRevList( "afterRevList", commit_list, fname );
    callbackChangeModel();
}

/**
 * Callback rev select.
 * @param value: not use
 */
async function callbackChangeModel( value ) {

    clearScene();

    let before_element = document.getElementById( "beforeRevList" );
    let after_element = document.getElementById( "afterRevList" );
    let selectFile_element = document.getElementById("FileList");
    let scaleselect_element = document.getElementById("ScaleSelect");
    let scale = scaleselect_element.Scale;

    let index = selectFile_element.selectedIndex;
    let fname = selectFile_element.options[index].label;
    let afterSTL;
    let beforeSTL;

    for( var commit_index in commit_list ) {
        if( commit_list[commit_index].hash == after_element.options[after_element.selectedIndex].value) {
            var hash = searchCommitTree( commit_list[commit_index], fname );
            var result = await loadGitObject(hash, "");
            if( result.type == "blob" ) {
                afterSTL = result.data;
                spawnAfterSTL( afterSTL, scale.value );
            }
            break;
        }
    }
 
    for( var commit_index in commit_list ) {
        if( commit_list[commit_index].hash == before_element.options[before_element.selectedIndex].value) {
            var hash = searchCommitTree( commit_list[commit_index], fname );
            var result = await loadGitObject(hash, "");
            if( result.type == "blob" ) {
                beforeSTL = result.data;
                spawnBeforeSTL( beforeSTL, scale.value );
            }
            break;
        }
    }

    var beforeAlpha = document.getElementById( "beforeAlpha" );
    var afterAlpha = document.getElementById( "afterAlpha" );
    beforeAlpha.value = 0.5;
    afterAlpha.value = 1.0;
}

/**
 * Callback save button.
 * @param none
 */
async function callbackSaveSTL() {

    let after_element = document.getElementById( "afterRevList" );
    let selectFile_element = document.getElementById("FileList");
    let index = selectFile_element.selectedIndex;
    let fname = selectFile_element.options[index].label;
    let stl;

    for( var commit_index in commit_list ) {
        if( commit_list[commit_index].hash == after_element.options[after_element.selectedIndex].value) {
            var hash = searchCommitTree( commit_list[commit_index], fname );
            var result = await loadGitObject(hash, "");
            if( result.type == "blob" ) {
                stl = result.data;
            }
            break;
        }
    }

    var tmp = fname.split('/');
    var downloadName = tmp[tmp.length-1];
    var stl_blob = new Blob([stl], {type: "application/octet-binary"})
    var objectURL = URL.createObjectURL( stl_blob );
    var link = document.createElement("a");
    document.body.appendChild(link);
    link.href = objectURL;
    link.download = downloadName;
    link.click();
    document.body.removeChild(link);
}
