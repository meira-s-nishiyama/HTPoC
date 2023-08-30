

/* ---------------------------------------------------------------- */
/* ServiceWorker登録                                                */
/* ---------------------------------------------------------------- */
function ServiceWorker_register()
{
    if ("serviceWorker" in navigator) {
    } else {
        alert("ServiceWorkerに対応していません。");
        return false;
    }

    navigator.serviceWorker.register("/HTPoC/sw.js", {scope: "/HTPoC/"})
    .then(function (registration)
    {
        console.log("serviceWorker registed.");
    })
    .catch(function (error)
    {
        alert("ServiceWorkerに対応していません。 " + error);
    });

    return true;
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* カメラ初期化                                                     */
/* ---------------------------------------------------------------- */
function Camera_init()
{
    // -- 設定 -----------------------------------------------------------
    const lst_config = {
        video: {
            facingMode: "environment",
            zoom      : true
        }
    };
    // -------------------------------------------------------------------

    // -- 無限ループ開始 ※コールバック化すべし。 ------------------------
    navigator.mediaDevices.getUserMedia(lst_config)
    .then(function(stream)
    {
        // -- 最大望遠 --------------------------------------------------------
        const [track]      = stream.getVideoTracks();
        const capabilities = track.getCapabilities();

        if (undefined === capabilities.zoom) {
            alert("ズームが使用できません。PCでも動作しますが、スマホにてテストして下さい。");
        } else {
//            alert(capabilities.zoom.min + ", " + capabilities.zoom.max + ", " + capabilities.zoom.step);
            track.applyConstraints(
                {
                    advanced: [
                        {
                            zoom: capabilities.zoom.max
                        }
                    ]
                }
            );
        }
        // -------------------------------------------------------------------

        // -- 撮影開始 -------------------------------------------------------
        const video_camera = document.getElementById("video_camera");

        video_camera.srcObject = stream;
        video_camera.setAttribute("playsinline", true);
        video_camera.play();
        // -------------------------------------------------------------------

        requestAnimationFrame(Camera_recognizeQR);
    });
    // -------------------------------------------------------------------
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* CANVAS<2D>直線描写                                               */
/* ---------------------------------------------------------------- */
function Canvas2d_drawLine(canvas, begin, end, color) {
    canvas.beginPath();
    canvas.moveTo(begin.x, begin.y);
    canvas.lineTo(end.x, end.y);
    canvas.lineWidth = 4;
    canvas.strokeStyle = color;
    canvas.stroke();
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* QR認識                                                           */
/* ---------------------------------------------------------------- */
function Camera_recognizeQR()
{
    try {

        const video_camera       = document.getElementById("video_camera");             // カメラ
        const div_cameraMsg      = document.getElementById("div_cameraMsg");            // カメラメッセージ
        const canvas_video       = document.getElementById("canvas_video");             // カメラ撮像CANVAS
        const canvas_video2d     = canvas_video.getContext("2d");                       // カメラ撮像CANVAS（二次元）
        const div_recognition    = document.getElementById("div_recognition");          // 認識結果
        const div_recognitionMsg = document.getElementById("div_recognitionMsg");       // 認識結果メッセージ
        const div_qrCode         = document.getElementById("div_qrCode");               // 認識結果QRコード

        div_cameraMsg.innerText = "⌛ カメラ起動中..."

        if (video_camera.readyState === video_camera.HAVE_ENOUGH_DATA) {

            div_cameraMsg.hidden = true;
            canvas_video.hidden = false;
            div_recognition.hidden = false;

            // -- 撮像表示 -------------------------------------------------------
            canvas_video.height = video_camera.videoHeight;
            canvas_video.width = video_camera.videoWidth;

            canvas_video2d.drawImage(video_camera, 0, 0, canvas_video.width, canvas_video.height);
            // -------------------------------------------------------------------

            // -- QR読取ガイド線 -------------------------------------------------
            edgeLen = canvas_video.height / 2;

            Canvas2d_drawLine(canvas_video2d, {x:canvas_video.width / 4          , y:canvas_video.height / 4          }, {x:canvas_video.width / 4          , y:canvas_video.height / 4 + edgeLen}, "#ffffff");
            Canvas2d_drawLine(canvas_video2d, {x:canvas_video.width / 4          , y:canvas_video.height / 4 + edgeLen}, {x:canvas_video.width / 4 + edgeLen, y:canvas_video.height / 4 + edgeLen}, "#ffffff");
            Canvas2d_drawLine(canvas_video2d, {x:canvas_video.width / 4 + edgeLen, y:canvas_video.height / 4 + edgeLen}, {x:canvas_video.width / 4 + edgeLen, y:canvas_video.height / 4          }, "#ffffff");
            Canvas2d_drawLine(canvas_video2d, {x:canvas_video.width / 4 + edgeLen, y:canvas_video.height / 4          }, {x:canvas_video.width / 4          , y:canvas_video.height / 4          }, "#ffffff");
            // -------------------------------------------------------------------

            // -- QR認識 ---------------------------------------------------------
            const imageData = canvas_video2d.getImageData(canvas_video.width / 4, canvas_video.height / 4, edgeLen, edgeLen);

            const qr = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (qr) {

                // -- 認識結果を赤枠囲み ---------------------------------------------
                Canvas2d_drawLine(canvas_video2d, {x:qr.location.topLeftCorner.x     + canvas_video.width / 4, y:qr.location.topLeftCorner.y     + canvas_video.height / 4}, {x:qr.location.topRightCorner.x    + canvas_video.width / 4, y:qr.location.topRightCorner.y    + canvas_video.height / 4}, "#FF3B58");
                Canvas2d_drawLine(canvas_video2d, {x:qr.location.topRightCorner.x    + canvas_video.width / 4, y:qr.location.topRightCorner.y    + canvas_video.height / 4}, {x:qr.location.bottomRightCorner.x + canvas_video.width / 4, y:qr.location.bottomRightCorner.y + canvas_video.height / 4}, "#FF3B58");
                Canvas2d_drawLine(canvas_video2d, {x:qr.location.bottomRightCorner.x + canvas_video.width / 4, y:qr.location.bottomRightCorner.y + canvas_video.height / 4}, {x:qr.location.bottomLeftCorner.x  + canvas_video.width / 4, y:qr.location.bottomLeftCorner.y  + canvas_video.height / 4}, "#FF3B58");
                Canvas2d_drawLine(canvas_video2d, {x:qr.location.bottomLeftCorner    + canvas_video.width / 4, y:qr.location.bottomLeftCorner.y  + canvas_video.height / 4}, {x:qr.location.topLeftCorner.x     + canvas_video.width / 4, y:qr.location.topLeftCorner.y     + canvas_video.height / 4}, "#FF3B58");
                // -------------------------------------------------------------------

                // -- 認識結果表示 ---------------------------------------------------
                div_recognitionMsg.hidden = true;
                div_qrCode.parentElement.hidden = false;
                div_qrCode.innerText = qr.data;
                // -------------------------------------------------------------------

                // -- 図面取得 -------------------------------------------------------
                BluePrint_get();
                // -------------------------------------------------------------------

                return true;

            } else {

                div_recognitionMsg.hidden = false;
                div_qrCode.parentElement.hidden = true;

            }
            // -------------------------------------------------------------------
        }

        requestAnimationFrame(Camera_recognizeQR);

    } catch (e) {

        alert(e.message);

    }
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* ページ初期化                                                     */
/* ---------------------------------------------------------------- */
function Page_init()
{
//    ServiceWorker_register();
    alert("START: Page_init()");
    Camera_init();
    alert("END: Page_init()");
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* 認識再開                                                         */
/* ---------------------------------------------------------------- */
function Scan_start()
{
    const lst_actions = {
        Symbols: [
        ],
        Do: [
            {
                Action    : "HtmlValue_set",
                Parameters: {
                    Mapping: [
                        { Html : { Quote: "img_document" } , Value: { Quote: "" } }
                    ]
                }
            },
            {
                Action: "ViewTable_delete",
                Parameters: {
                    Table: { Quote: "table_documents" }
                }
            },
        ]
    };

    const json_actions = JSON.stringify(lst_actions);
    Action_do(json_actions);

    document.getElementById("button_scan").disabled = true;
    requestAnimationFrame(Camera_recognizeQR);
}
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* 図面取得                                                         */
/* ---------------------------------------------------------------- */
function BluePrint_get()
{
    const lst_actions = {
        Symbols: [
            { ID: "qr_wip"          },
            { ID: "lst_wip"         },
            { ID: "lst_bluePrints"  },
            { ID: "json_bluePrints" }
        ],
        Do: [
            {
                Action    : "Action_LoadingBar_open"
            },
            {
                Comment   : "図面画像白紙化",
                Action    : "HtmlValue_set",
                Parameters: {
                    Mapping: [
                        { Html : { Quote: "img_document" } , Value: { Quote: "" } }
                    ]
                }
            },
            {
                Comment   : "図面一覧初期化",
                Action    : "ViewTable_delete",
                Parameters: {
                    Table: { Quote: "table_documents" }
                }
            },
            {
                Comment   : "工程票QR取得",
                Action    : "Action_ViewCard_get",
                Parameters: {
                    Mapping: [
                        { Key: { Quote: "WIP_CD" }, Html: { Quote: "div_qrCode" } }
                    ]
                },
                ReturnTo: "qr_wip"
            },
            {
                Comment   : "仕掛情報取得",
                Action    : "RestApi_call",
                Parameters: {
                    URL       : { Quote: "http://172.16.2.247/BluePrint/api/Wip" },
                    Method    : { Quote: "GET" },
                    Parameters: {
                        WIP_CD: { ListEval: [ "qr_wip", { Quote: "WIP_CD" } ] }
                    }
                },
                ReturnTo  : "lst_wip"
            },
            {
                Comment   : "図面一覧取得",
                Action    : "RestApi_call",
                Parameters: {
                    URL       : { Quote: "http://172.16.2.247/BluePrint/api/DocumentMeta" },
                    Method    : { Quote: "GET" },
                    Parameters: {
                        ITEM_CD: { ListEval: [ "lst_wip", { Quote: 0 }, { Quote: "ITEM_CD" }         ] },
                        PROC_CD: { ListEval: [ "lst_wip", { Quote: 0 }, { Quote: "WORK_IN_PROC_CD" } ] }
                    }
                },
                ReturnTo  : "lst_bluePrints"
            },
/*
            {
                Action: "Action_Json_encode",
                Parameters: {
                    Value: "lst_bluePrints"
                },
                ReturnTo: "json_bluePrints"
            },
            {
                Action: "Action_alert",
                Parameters: {
                    Message: "json_bluePrints"
                }
            },
*/
            {
                Comment   : "図面一覧表示",
                Action    : "ViewTable_display",
                Parameters: {
                    Table: { Quote: "table_documents" },
                    DataSource: "lst_bluePrints",
                    DataMapping: [
                        { Selector : { Quote: ".Document > button" }, Column: { Quote: "dd_doc_id" }                        },
                        { Selector : { Quote: ".Document > button" }, Column: { Quote: "dd_title" } , Text: { Quote: true } }
                    ],
                    ID: { Quote: "dd_doc_id" },
                    Events: [
                        {
                            Selector: { Quote: ".Document > button" },
                            Trigger : { Quote: "click" },
                            Actions : {
                                Symbols: [
                                    { ID: "url_img" }
                                ],
                                Do: [
                                    {
                                        Action    : "Action_LoadingBar_open"
                                    },
                                    {
                                        Comment   : "図面URL",
                                        Action    : "String_concat",
                                        Parameters: {
                                            Strings: {
                                                Dir : { Quote: "http://172.16.2.247/BluePrint/WebStorage/PNG/" },
                                                File: { Quote: "__THIS_VALUE__" },
                                                Ext : { Quote: ".png" }
                                            }
                                        },
                                        ReturnTo: "url_img"
                                    },
                                    {
                                        Comment   : "図面ダウンロード",
                                        Action    : "HtmlValue_set",
                                        Parameters: {
                                            Mapping: [
                                                { Html : { Quote: "img_document" } , Value: "url_img" }
                                            ]
                                        }
                                    },
                                    {
                                        Action    : "Action_LoadingBar_close"
                                    }
                                ]
                            }
                        }
                    ]
                }
            },
            {
                Action    : "Action_LoadingBar_close"
            }
        ]
    };

    const json_actions = JSON.stringify(lst_actions);
    Action_do(json_actions);

    document.getElementById("button_scan").disabled = false;
}
/* ---------------------------------------------------------------- */
