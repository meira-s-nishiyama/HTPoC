/* ---------------------------------------------------------------- */
/* URLパラメータJSONデコード                                        */
/* ---------------------------------------------------------------- */
function UrlJson_decode()
{
    if (-1 == location.href.indexOf("?", 0)) {
        return null;
    }

    const json_parameter = decodeURI(location.href.split("?")[1]);
    const lst_parameter  = JSON.parse(json_parameter);

    return lst_parameter;
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* Cookie取得                                                       */
/* ---------------------------------------------------------------- */
function Cookie_get(nm_cookie)
{
    let vl = "";

    const lst_cookie = document.cookie.split("; ");

    for (const el_cookie of lst_cookie) {
        const nm = el_cookie.substr(0, nm_cookie.length);
        if (nm_cookie === nm) {
            vl = el_cookie.substr(nm_cookie.length + 1);
            break;
        }
    }

    return vl;
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* サービス要求                                                     */
/* ---------------------------------------------------------------- */
async function Service_request(url_resource, typ_method, lst_request, fnc_right, fnc_left)
{
    // -- サービス要求 ---------------------------------------------------
    const lst_options = {
        method: typ_method,
        header: {
            "Content-type": "application/json"
        },
    };

    let str_options = "";

    if ("GET" === typ_method) {
        if (null === lst_request) {
            str_options =  "?" + "{}";
        } else {
            str_options =  "?" + JSON.stringify(lst_request);
        }
    } else {
        lst_options.body = JSON.stringify(lst_request);
    }

    const response     = await fetch(url_resource + str_options, lst_options);
    const lst_response = await response.json();
    // -------------------------------------------------------------------

    // -- 要求結果処理 ---------------------------------------------------
    if (true === lst_response.RESULT) {
        fnc_right(lst_response.RETURN);
    } else {
        fnc_left(lst_response.RETURN);
    }
    // -------------------------------------------------------------------

    return;
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* ログイン                                                         */
/* ---------------------------------------------------------------- */
async function Developer_login(id, password)
{
    await Service_request("../api/Login", "POST", { USER_ID: id, PASSWORD: password },
    function(lst_right)
    {
        location.href = lst_right.MAIN;
    },
    function(lst_left)
    {
        alert(lst_left);
    });
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* 成果物一覧取得                                                   */
/* ---------------------------------------------------------------- */
async function Deliverables_get(typ, id, nm, fnc_right, fnc_left)
{
    const token = Cookie_get("TOKEN");

    const lst_request = {
        SEARCH_FILTER: {
            TYP: (undefined === typ ? "" : typ),
            ID:  (undefined === id  ? "" : id),
            NM:  (undefined === nm  ? "" : nm)
        },
        TOKEN: token
    };

    await Service_request("../api/Deliverables", "GET", lst_request,
    function(lst_right)
    {
        fnc_right(lst_right);
    },
    function(lst_left)
    {
        fnc_left(lst_left);
    });
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* アプリ情報取得                                                   */
/* ---------------------------------------------------------------- */
async function App_get(id, nm, id_parent, fnc_right, fnc_left)
{
    const token = Cookie_get("TOKEN");

    const lst_request = {
        SEARCH_FILTER: {
            ID: (undefined === id ? "" : id),
            NM: (undefined === nm ? "" : nm),
            PARENT_ID: (undefined === id_parent ? "" : id_parent)
        },
        TOKEN: token
    };

    await Service_request("../api/App", "GET", lst_request,
    function(lst_right)
    {
        fnc_right(lst_right);
    },
    function(lst_left)
    {
        fnc_left(lst_left);
    });
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]開始                                                     */
/* ---------------------------------------------------------------- */
function Action_do(json_actions, returnTo, lst_dictionary)
{
    const lst_actions = JSON.parse(json_actions);

    // -- プログラムカウンタ初期化 ---------------------------------------
    lst_actions.ProgramCounter = -1;
    // -------------------------------------------------------------------

    // -- リターンスタック -----------------------------------------------
    if (undefined === returnTo) {
    } else {
        lst_actions.ReturnStack = returnTo;
    }
    // -------------------------------------------------------------------

    // -- シンボル辞書登録 -----------------------------------------------
    if (undefined === lst_dictionary) {
        lst_actions.Dictionary = {};
    } else {
        lst_actions.Dictionary = lst_dictionary;
    }

    if (undefined === lst_actions.Symbols) {
    } else {
        for (const def_var of lst_actions.Symbols) {
            lst_actions.Dictionary[def_var.ID] = null;
        }
    }
    // -------------------------------------------------------------------

    Action_next(lst_actions, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]次工程実行                                               */
/* ---------------------------------------------------------------- */
function Action_next(lst_actions, result, returnValue)
{
    // -- 前工程エラー⇒停止 ---------------------------------------------
    if (false === result) {
        return false;
    }
    // -------------------------------------------------------------------

    // -- 前工程戻値代入 -------------------------------------------------
    if (-1 === lst_actions.ProgramCounter) {
    } else {
        const action_pre = lst_actions.Do[lst_actions.ProgramCounter];

        if (undefined === action_pre.ReturnTo) {
        } else {
            lst_actions.Dictionary[action_pre.ReturnTo] = returnValue;
        }
    }
    // -------------------------------------------------------------------

    // -- 次アクション ---------------------------------------------------
    lst_actions.ProgramCounter++;

    const action = lst_actions.Do[lst_actions.ProgramCounter];

    if (undefined === action) {
        if (undefined === lst_actions.ReturnStack) {
        } else {
           Action_next(lst_actions.ReturnStack, true, returnValue);
        }
        return true;
    }

    const nm_fnc = action.Action;
    // -------------------------------------------------------------------

    // -- アクション終了 -------------------------------------------------
    if ("Action_end" === nm_fnc) {
        return true;
    }
    // -------------------------------------------------------------------

    // -- 条件分岐 -------------------------------------------------------
    if ("Condition_branch" === nm_fnc) {
        Condition_branch(lst_actions, action);
        return true;
    }
    // -------------------------------------------------------------------

    // -- 引数評価 -------------------------------------------------------
    const lst_args = Action_eval(action.Parameters, lst_actions.Dictionary);
    // -------------------------------------------------------------------

    // -- 次アクション実行 -----------------------------------------------
    const fnc = new Function("lst_actions", "action", "lst_args", nm_fnc + "(lst_actions, action, lst_args)");

    fnc(lst_actions, action, lst_args);
    // -------------------------------------------------------------------

    return true;
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]S式評価                                                  */
/* ---------------------------------------------------------------- */
function Action_eval(lst, dictionary)
{
    let lst_evaled = {};

    for (const ky in lst) {

        // -- アクション -----------------------------------------------------
        if ("Actions" === ky) {
            lst_evaled[ky] = lst[ky];
            continue;
        }
        // -------------------------------------------------------------------

        // -- 定数 -----------------------------------------------------------
        if (undefined === lst[ky].Constant) {
        } else {
            switch (lst[ky].Constant) {
                case "__TODAY__":
                    const dt = new Date();
                    lst_evaled[ky] = dt.toLocaleDateString("ja-JP", {year: "numeric", month: "2-digit", day: "2-digit"}).split("/").join("-");
                    break;
                default:
                    lst_evaled[ky] = "";
                    break;
            }
            continue;
        }
        // -------------------------------------------------------------------

        // -- クォート -------------------------------------------------------
        if (undefined === lst[ky].Quote) {
        } else {
            lst_evaled[ky] = lst[ky].Quote;
            continue;
        }
        // -------------------------------------------------------------------

        // -- リスト値 -------------------------------------------------------
        if (undefined === lst[ky].ListEval) {
        } else {
            lst_evaled[ky] = Action_evalList(lst[ky].ListEval, dictionary);
            continue;
        }
        // -------------------------------------------------------------------

        // -- 連想配列 -------------------------------------------------------
        if ("Object" === Object.getPrototypeOf(lst[ky]).constructor.name) {
            lst_evaled[ky] = Action_eval(lst[ky], dictionary);
            continue;
        }
        // -------------------------------------------------------------------

        // -- 配列 -----------------------------------------------------------
        if (true === Array.isArray(lst[ky])) {
            let tmp_array = [];
            for (let i = 0; i < lst[ky].length; i++) {
                if (undefined === lst[ky][i].ListEval) {
                    tmp_array[i] = Action_eval(lst[ky][i], dictionary);
                } else {
                    tmp_array[i] = Action_evalList(lst[ky][i].ListEval, dictionary);
                }
            }
            lst_evaled[ky] = tmp_array;
            continue;
        }
        // -------------------------------------------------------------------

        // -- シンボル -------------------------------------------------------
        lst_evaled[ky] = dictionary[lst[ky]];
        // -------------------------------------------------------------------
    }

    return lst_evaled;
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]リスト評価                                               */
/* ---------------------------------------------------------------- */
function Action_evalList(lst, dictionary)
{
    // -- 探索経路 -------------------------------------------------------
    const lst_route = [];

    for (const el of lst) {

        // -- クォート -------------------------------------------------------
        if (undefined === el.Quote) {
        } else {
            lst_route.push(el.Quote);
            continue;
        }
        // -------------------------------------------------------------------

        // -- シンボル -------------------------------------------------------
        lst_route.push(el);
        // -------------------------------------------------------------------

    }
    // -------------------------------------------------------------------

    // -- 値取得 ---------------------------------------------------------
    let vl = dictionary[lst_route[0]];

    for (let i = 1; i < lst_route.length; i++) {
        vl = vl[lst_route[i]];
    }
    // -------------------------------------------------------------------

    return (undefined === vl ? "" : vl);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]条件分岐                                                 */
/* ---------------------------------------------------------------- */
function Condition_branch(lst_action, action)
{
    for (const condition of action.Conditions) {
        const cond = Action_eval(condition.Condition, lst_action.Dictionary);
        console.log(cond);

        if ("=" === cond.Operator) {
            if (cond.OP_A === cond.OP_B) {
                const json_actions = JSON.stringify(condition.Action);
                Action_do(json_actions, lst_action, lst_action.Dictionary);
                break;
            }
        } else if (">" === cond.Operator) {
            if (cond.OP_A > cond.OP_B) {
                const json_actions = JSON.stringify(condition.Action);
                Action_do(json_actions, lst_action, lst_action.Dictionary);
                break;
            }
        }
    }
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]シンボル代入                                             */
/* ---------------------------------------------------------------- */
function Symbol_set(lst_action, action, lst_args)
{
    Action_next(lst_action, true, lst_args.Value);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]文字列結合                                               */
/* ---------------------------------------------------------------- */
function String_concat(lst_action, action, lst_args)
{
    // -- 引数展開 -------------------------------------------------------
    const lst_strings = lst_args.Strings;
    // -------------------------------------------------------------------

    let str = "";

    for (const ky in lst_strings) {
        str += lst_strings[ky];
    }

    Action_next(lst_action, true, str);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]リスト追加                                               */
/* ---------------------------------------------------------------- */
function Action_List_create(lst_action, action, lst_args)
{
    // -- 引数展開 -------------------------------------------------------
    const lst_defs = lst_args.Values;
    // -------------------------------------------------------------------

    // -- リスト作成 -----------------------------------------------------
    let lst = {};

    for (let i = 0; i < lst_defs.length; i++) {
        const ky = lst_defs[i].Key;
        const vl = lst_defs[i].Value;
        lst[ky] = vl;
    }
    // -------------------------------------------------------------------

    Action_next(lst_action, true, lst);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]JSON⇒連想配列変換                                       */
/* ---------------------------------------------------------------- */
function Action_Json_decode(lst_action, action, lst_args)
{
    let lst = null;

    if ("" === lst_args.JSON) {
    } else {
        lst = JSON.parse(lst_args.JSON);
    }

    Action_next(lst_action, true, lst);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]連想配列⇒JSON変換                                       */
/* ---------------------------------------------------------------- */
function Action_Json_encode(lst_action, action, lst_args)
{
    const json = JSON.stringify(lst_args.Value);

    Action_next(lst_action, true, json);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]URLパラメータJSONデコード                                */
/* ---------------------------------------------------------------- */
function Action_UrlJson_get(lst_action, action, lst_args)
{
    let lst_parameter = null;

    if (-1 == location.href.indexOf("?", 0)) {
        lst_parameter = null;
    } else {
        const json_parameter = decodeURI(location.href.split("?")[1]);
console.log(location.href.split("?")[1]);
console.log(json_parameter);
        lst_parameter = JSON.parse(json_parameter);
    }

    Action_next(lst_action, true, lst_parameter);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]ローディングバーオープン                                 */
/* ---------------------------------------------------------------- */
function Action_LoadingBar_open(lst_action, action, lst_args)
{
    document.getElementById("modal_smoke").style.display = "inline";
    document.getElementById("modal_loading").style.top = (window.innerHeight * 0.25) + "px";
    document.getElementById("modal_loading").style.left = (window.innerWidth * 0.25) + "px";
    document.getElementById("modal_loading").style.display = "inline";

    Action_next(lst_action, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* ローディングバークローズ                                           */
/* ---------------------------------------------------------------- */
function Action_LoadingBar_close(lst_action, action, lst_args)
{
    document.getElementById("modal_loading").style.display = "none";
    document.getElementById("modal_smoke").style.display = "none";

    Action_next(lst_action, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]コンソール出力                                           */
/* ---------------------------------------------------------------- */
function Action_Console_out(lst_action, action, lst_args)
{
    const str_message = lst_args.Message;
    console.log(str_message);

    Action_next(lst_action, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]アラート表示                                             */
/* ---------------------------------------------------------------- */
function Action_alert(lst_action, action, lst_args)
{
    const str_message = lst_args.Message;
    alert(str_message);

    Action_next(lst_action, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]Cookie保存                                               */
/* ---------------------------------------------------------------- */
function Action_Cookie_set(lst_action, action, lst_args)
{
    const nm_cookie = lst_args.Name;
    const vl_cookie = lst_args.Value;
    const trm_age   = lst_args.MaxAge;

    document.cookie = nm_cookie + "=" + vl_cookie + ";" + ("" === trm_age ? ";" : ";max-age=" + trm_age + ";");

    Action_next(lst_action, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]Cookie取得                                               */
/* ---------------------------------------------------------------- */
function Cookie_get2(lst_action, action, lst_args)
{
    const nm_cookie = lst_args.Name;

    let vl = "";

    const lst_cookie = document.cookie.split("; ");

    for (const el_cookie of lst_cookie) {
        const nm = el_cookie.substr(0, nm_cookie.length);
        if (nm_cookie === nm) {
            vl = el_cookie.substr(nm_cookie.length + 1);
            break;
        }
    }

    Action_next(lst_action, true, vl);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]ページ遷移                                               */
/* ---------------------------------------------------------------- */
function Page_trans(lst_action)
{
    const action = lst_action[0];

    const json_parameters = JSON.stringify(action.Parameters.Parameters);
    console.log(json_parameters);

    location.href = action.Parameters.GoTo + "?" + encodeURI(json_parameters);

    Action_next(lst_action, true, null);
}

function Page_jump(lst_action, action, lst_args)
{
    const json_parameters = JSON.stringify(lst_args.Parameters);

    location.href = lst_args.GoTo + "?" + encodeURI(json_parameters);

    Action_next(lst_action, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]タイトル変更                                             */
/* ---------------------------------------------------------------- */
function Title_set(lst_action, action, lst_args)
{
    document.querySelector("title").textContent = lst_args.Text;

    Action_next(lst_action, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]ヘッダ変更                                               */
/* ---------------------------------------------------------------- */
function Header_set(lst_action, action, lst_args)
{
    document.querySelector("#span_headerTitle").textContent = lst_args.Text;

    Action_next(lst_action, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]新規ウィンドウ                                           */
/* ---------------------------------------------------------------- */
function Window_open(lst_action, action, lst_args)
{
    // -- 引数 -----------------------------------------------------------
    const url_new = lst_args.URL;
    const opt     = lst_args.Option;
    const width   = lst_args.Width;
    const height  = lst_args.Height;
    // -------------------------------------------------------------------

    window.open(url_new + (undefined === opt ? "" : "?" + opt), null, "width=" + (undefined === width ? "500" : width) + ",height=" + (undefined === height ? 500 : height) + ",toolbar=yes,menubar=yes,scrollbars=yes");

    Action_next(lst_action, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]REST-API実行                                             */
/* ---------------------------------------------------------------- */
async function RestApi_call(lst_action, action, lst_args)
{
    // -- 引数 -----------------------------------------------------------
    const url_resource = lst_args.URL;
    const typ_method   = lst_args.Method;
    const lst_request  = lst_args.Parameters;
    // -------------------------------------------------------------------

    // -- 送信ヘッダ -----------------------------------------------------
    const lst_options = {
        method: typ_method,
        header: {
            "Content-type": "application/json"
        }
    };
    // -------------------------------------------------------------------

    // -- オプション -----------------------------------------------------
    let str_options = "";

    if ("GET" === typ_method) {
        if (null === lst_request) {
            str_options =  "";
        } else {
            str_options =  "?" + encodeURI(JSON.stringify(lst_request));
        }
    } else {
        lst_options.body = JSON.stringify(lst_request);
    }
    // -------------------------------------------------------------------

    // -- API要求 --------------------------------------------------------
    const response     = await fetch(url_resource + str_options, lst_options);
    const lst_response = await response.json();
    // -------------------------------------------------------------------

    // -- API回答 --------------------------------------------------------
    if (true === lst_response.RESULT) {
        console.log(lst_response.RETURN);
/*
        if (undefined === action.ReturnTo) {
        } else {
            lst_action.Dictionary[action.ReturnTo] = lst_response.RETURN;
        }
*/
        Action_next(lst_action, true, lst_response.RETURN);
    } else {
        console.log(lst_response.RETURN);
        alert(lst_response.RETURN);
        Action_next(lst_action, false, lst_response.RETURN);
    }
    // -------------------------------------------------------------------

    return;
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]バリデーションチェック                                   */
/* ---------------------------------------------------------------- */
function Action_Validation_check(lst_action, action, lst_args)
{
    const lst_invalidInputs = document.querySelectorAll(":invalid");

    Action_next(lst_action, true, lst_invalidInputs.length);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action]リスト値画面表示                                         */
/* ---------------------------------------------------------------- */
function HtmlValue_set(lst_action, action, lst_args)
{
    for (let i = 0; i < lst_args.Mapping.length; i++) {
        const id_el   = lst_args.Mapping[i].Html;
        const vl      = lst_args.Mapping[i].Value;
        const html_el = document.getElementById(id_el);
        
        const nm_tag = html_el.tagName;

        switch (nm_tag) {
            case "SELECT":
                if (0 === html_el.options.length) {
                    for (const el_vl of vl) {
                        const html_option = document.createElement("option");
                        html_option.value = el_vl.KEY;
                        html_option.textContent = el_vl.VALUE;
                        html_el.appendChild(html_option);
                    }
                } else {
                    html_el.value = vl;
                }
                break;
            case "INPUT":
                html_el.value = vl;
                break;
            case "IMG":
                html_el.src = vl;
                break;
            default:
                html_el.textContent = vl;
                break;
        }
    }

    Action_next(lst_action, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action][ViewCard]カード入力値取得                               */
/* ---------------------------------------------------------------- */
function Action_ViewCard_get(lst_action, action, lst_args)
{
    let lst_ret = {};
    let vl = null;

    for (let i = 0; i < lst_args.Mapping.length; i++) {
        const ky      = lst_args.Mapping[i].Key;
        const id_el   = lst_args.Mapping[i].Html;
        const html_el = document.getElementById(id_el);

        vl = null;
        
        const nm_tag = html_el.tagName;

        switch (nm_tag) {
            case "SELECT":
                const lst_options = document.querySelectorAll("#" + id_el + " option:checked");
                if (1 === lst_options.length) {
                    vl = html_el.value;
                } else {
                    let lst_tmp = [];
                    for (const option of lst_options) {
                        lst_tmp.push(option.value);
                    }
                    vl = lst_tmp;
                }
                break;
            case "INPUT":
            case "TEXTAREA":
                vl = html_el.value;
                break;
            default:
                vl = html_el.textContent;
                break;
        }

        if (true === Array.isArray(ky)) {
            let tmp_obj = lst_ret;
            for (let i = 0; i < ky.length - 1; i++) {
                if (undefined === tmp_obj[ky[i]]) {
                    tmp_obj[ky[i]] = {};
                }
                tmp_obj = tmp_obj[ky[i]];
            }
            let nm = ky[ky.length - 1];
            let obj = {};
            obj[nm] = vl;
            Object.assign(tmp_obj, obj);
        } else {
            lst_ret[ky] = vl;
        }
    }

    Action_next(lst_action, true, lst_ret);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action][ViewTable]全行削除                                      */
/* ---------------------------------------------------------------- */
function ViewTable_delete(lst_action, action, lst_args)
{
    const table = document.getElementById(lst_args.Table);
    const tbody = table.querySelector("tbody");

    while (tbody.rows.length > 0) {
        tbody.deleteRow(0);
    }

    Action_next(lst_action, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action][ViewTable]表示                                          */
/* ---------------------------------------------------------------- */
function ViewTable_display(lst_action, action, lst_args)
{
    // -- 引数展開 -------------------------------------------------------
    const id_table   = lst_args.Table;
    const lst_map    = lst_args.DataMapping;
    const lst_data   = lst_args.DataSource;
    const def_id     = lst_args.ID;
    const lst_events = lst_args.Events;
    // -------------------------------------------------------------------

    // -- テーブル取得 ---------------------------------------------------
    const table    = document.getElementById(id_table);
    const tbody    = table.querySelector("tbody");           // <tbody>
    const template = table.querySelector("template");        // <template>
    // -------------------------------------------------------------------

    // -- テンプレートクローン -------------------------------------------
    const Template_clone = function(source)
    {
        const tmp_tbody = document.createElement("tbody");
        tmp_tbody.innerHTML = source.innerHTML;
        const clone = tmp_tbody.querySelector("tr");
        return clone;
    };
    // -------------------------------------------------------------------

    // -- 表示 -----------------------------------------------------------
    for (let r = 0; r < lst_data.length; r++) {

        // -- テンプレートクローン -------------------------------------------
        let tr_clone = Template_clone(template);
        // -------------------------------------------------------------------

        // -- ID設定 ---------------------------------------------------------
        let str_id = "";

        if (undefined === def_id) {
        } else {

            let tmp_id = "";

            if ("__INDEX__" === def_id) {
                tmp_id = tbody.rows.length;
            } else {
                tmp_id = lst_data[r][def_id];
            }

            str_id = id_table + "_" + tmp_id;
            tr_clone.id = str_id;
        }
        // -------------------------------------------------------------------

        // -- 各列<td>セット -------------------------------------------------
        for (let c = 0; c < lst_map.length; c++) {

            const td         = tr_clone.querySelector(lst_map[c].Selector);                              // <td>
            const def_column = lst_map[c].Column;                                            // リスト列定義
//            const flg_old    = (undefined === lst_map[c].OLD_VL_FLG ? false : lst_map[c].OLD_VL_FLG);    // 更新前値保持フラグ

            // -- 定義が配列の場合、JSON化して格納 -------------------------------
            let vl = null;

            if (true === Array.isArray(def_column)) {
                let tmp_vl = {};
                for (let i = 0; i < def_column.length; i++) {
                    tmp_vl[def_column[i]] = lst_data[r][def_column[i]];
                }
                vl = JSON.stringify(tmp_vl);
            } else {
                switch (def_column) {
                    case "__INDEX__":
                        vl = r;
                        break;
                    case "__ROWNO__":
                        vl = r + 1;
                        break;
                    case "__RAW__":
                        vl = JSON.stringify(lst_data[r]);
                        break;
                    case "__ID__":
                        vl = str_id;
                        break;
                    default:
                        const tmp_vl = lst_data[r][def_column];
                        if ("string" === typeof tmp_vl) {
                            if (undefined === lst_map[c].LENGTH) {
                                vl = tmp_vl;
                            } else {
                                vl = tmp_vl.slice(0, lst_map[c].LENGTH);
                            }
                        } else {
                            vl = tmp_vl;
                        }
                        break;
                }
            }
            // -------------------------------------------------------------------

            // -- <td>子要素に格納の場合、valueに値セット ------------------------
            switch (td.tagName) {
                case "BUTTON":
                case "INPUT":

                    if ("checkbox" === td.type) {
                        td.checked = (vl === true ? true : false);
                    } else {
                        if (undefined === lst_map[c].Text) {
                            td.value = vl;
                        } else {
                            td.innerText = vl;
                        }
                    }

                    td.addEventListener("change", function()
                    {
                        tr_clone.querySelector(".UploadMrk").textContent = ("1" === tr_clone.querySelector(".DownloadFlg").textContent ? "U" : "C");
                    });

                    break;

                case "SELECT":
                    td.value = vl;
                    break;
                default:
                    td.textContent = vl;
                    break;
            }
            // -------------------------------------------------------------------
/*
            // -- OLD_VL == true ⇒ 更新前値保持----------------------------------
            if (true === flg_old) {
                td.OLD_VL = vl;
            }
            // -------------------------------------------------------------------
*/
        }
        // -------------------------------------------------------------------

        // -- イベント設定 ---------------------------------------------------
        if (undefined === lst_events) {
        } else {
            for (let i = 0; i < lst_events.length; i++) {
                const def_event  = lst_events[i];
                const el_trigger = tr_clone.querySelector(def_event.Selector);
                const ev_trigger = def_event.Trigger;

                el_trigger.addEventListener(ev_trigger, function()
                {
                    let json_action = JSON.stringify(def_event.Actions);
                    json_action = json_action.replace(/__THIS_VALUE__/g, this.value);
                    json_action = json_action.replace(/__SUB_THIS_VALUE__/g, "__THIS_VALUE__");

                    Action_do(json_action, undefined, lst_action.Dictionary);
                });
            }
        }
        // -------------------------------------------------------------------

/*
        // -- ダウンロードフラグ＝1 ------------------------------------------
        tr_clone.querySelector(".DownloadFlg").textContent = (true === flg_add ? "" : "1");
        // -------------------------------------------------------------------

        // -- 変更時イベント設定 ---------------------------------------------
        const cnt_event = (undefined === table.ViewTable.OnChangeEvent ? 0 : table.ViewTable.OnChangeEvent.length);

        for (let i = 0; i < cnt_event; i++) {
            const def_event = table.ViewTable.OnChangeEvent[i];
            const td = tr_clone.querySelector(def_event.Selector)
            td.addEventListener("change", ViewTable_Column_onChange);
            td.ViewCard = {
                BindTo         : def_event.BindTo,
                EffectedClass  : def_event.EffectedClass,
                DownloadService: def_event.DownloadService
            };
        }
        // -------------------------------------------------------------------
*/

        // -- <tr>追加 -------------------------------------------------------
        tbody.appendChild(tr_clone);
        // -------------------------------------------------------------------
    }
    // -------------------------------------------------------------------

    Action_next(lst_action, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action][ViewTable]行⇒リスト                                    */
/* ---------------------------------------------------------------- */
function ViewTable_getRecord(lst_action, action, lst_args)
{
    // -- 引数展開 -------------------------------------------------------
    const id_table = lst_args.Table;
    const id_tr    = lst_args.ID;
    const lst_map  = lst_args.DataMapping;
    // -------------------------------------------------------------------

    // -- <TR>取得 -------------------------------------------------------
    const table = document.getElementById(id_table);
    const tr    = table.querySelector("#" + id_tr);
    // -------------------------------------------------------------------

    // -- <TD>値取得 -----------------------------------------------------
    let lst_ret = {};

    for (let c = 0; c < lst_map.length; c++) {
        const vl_const     = lst_map[c].Constant;                      // 定数
        const def_windowVl = lst_map[c].Window;                        // 画面表示値
        const td           = tr.querySelector(lst_map[c].Selector);    // <td>
        const def_column   = lst_map[c].Column;                        // リスト列定義

        let vl = null;

        // -- 値取得 ---------------------------------------------------------
        if (undefined !== vl_const) {
            vl = vl_const;
            lst_ret[def_column] = vl;
        } else if (undefined !== def_windowVl) {
            vl = document.querySelector(def_windowVl).value;
            lst_ret[def_column] = vl;
        } else {
            switch (td.tagName) {
                case "BUTTON":
                case "INPUT":
                    if ("checkbox" === td.type) {
                        vl = (true === td.checked ? true : false);
                        lst_ret[def_column] = vl;
                    } else if ("date" === td.type) {
                        const dt = new Date(td.value);
                        vl = dt.toLocaleDateString("ja-JP", {year: "numeric", month: "2-digit", day: "2-digit"});
                        lst_ret[def_column] = vl;
                    } else {
                        vl = td.value;
                        lst_ret[def_column] = vl;
                    }
                    break;
                case "SELECT":
                    vl = td.value;
                    lst_ret[def_column] = vl;
                    break;
                default:
                    vl = td.textContent;
                    lst_ret[def_column] = vl;
                    break;
            }
        }
        // -------------------------------------------------------------------
    }
    // -------------------------------------------------------------------

    Action_next(lst_action, true, [lst_ret]);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action][ViewTable]行削除                                        */
/* ---------------------------------------------------------------- */
function ViewTable_deleteRecord(lst_action, action, lst_args)
{
    // -- 引数展開 -------------------------------------------------------
    const id_table = lst_args.Table;
    const id_tr    = lst_args.ID;
    // -------------------------------------------------------------------

    // -- <TR>取得 -------------------------------------------------------
    const table = document.getElementById(id_table);
    const tr    = table.querySelector("#" + id_tr);
    // -------------------------------------------------------------------

    tr.remove();

    Action_next(lst_action, true, null);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* [Action][ViewTable]テーブル⇒リスト                              */
/* ---------------------------------------------------------------- */
function ViewTable_2list(lst_action, action, lst_args)
{
    // -- 引数展開 -------------------------------------------------------
    const id_table = lst_args.Table;
    const lst_map  = lst_args.DataMapping;
    // -------------------------------------------------------------------

    // -- <TABLE>取得 ----------------------------------------------------
    const table = document.getElementById(id_table);
    const tbody = table.querySelector("tbody");
    // -------------------------------------------------------------------

    // -- <TR>取得 -------------------------------------------------------
    let lst_ret = [];

    for (let r = 0; r < tbody.rows.length; r++) {

        let lst_row = {};

        for (let c = 0; c < lst_map.length; c++) {

            const tr         = tbody.rows[r];
            const vl_const   = lst_map[c].Constant;                      // 定数
            const td         = tr.querySelector(lst_map[c].Selector);    // <td>
            const def_column = lst_map[c].Column;                        // リスト列定義

            let vl = null;

            // -- 値取得 ---------------------------------------------------------
            if (undefined === vl_const) {
                switch (td.tagName) {
                    case "BUTTON":
                    case "INPUT":
                        if ("checkbox" === td.type) {
                            vl = (true === td.checked ? true : false);
                            lst_row[def_column] = vl;
                        } else if ("date" === td.type) {
                            const dt = new Date(td.value);
                            vl = dt.toLocaleDateString("ja-JP", {year: "numeric", month: "2-digit", day: "2-digit"});
                            lst_row[def_column] = vl;
                        } else {
                            vl = td.value;
                            lst_row[def_column] = vl;
                        }
                        break;
                    case "SELECT":
                        vl = td.value;
                        lst_row[def_column] = vl;
                        break;
                    default:
                        vl = td.textContent;
                        lst_row[def_column] = vl;
                        break;
                }
            } else {
                vl = vl_const;
                lst_row[def_column] = vl;
            }
            // -------------------------------------------------------------------
        }

        lst_ret.push(lst_row);
    }
    // -------------------------------------------------------------------

    Action_next(lst_action, true, lst_ret);
}
/* ---------------------------------------------------------------- */
