/*
self.addEventListener("fetch", function(e) {
});
*/
window.addEventListener("load", Page_init);

/* -- グローバル変数（手抜き） ------------------------------------ */
var video_qr = document.createElement("video");
var canvas_video = document.getElementById("canvas_video");
var canvas_2d = canvas_video.getContext("2d");
var loadingMessage = document.getElementById("loadingMessage");
var outputContainer = document.getElementById("output");
var outputMessage = document.getElementById("outputMessage");
var outputData = document.getElementById("outputData");
/* ---------------------------------------------------------------- */

/* -- フロントカメラ有効化 ---------------------------------------- */
/* ※本当はコールバック関数でやるべき。これも手抜き。               */
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", zoom: true } })
.then(function(stream)
{
    const [track]      = stream.getVideoTracks();
    const capabilities = track.getCapabilities();

    if (undefined === capabilities.zoom) {
        alert("ズームが使用できません。スマホにてテストして下さい。");
    } else {
//        alert(capabilities.zoom.min + ", " + capabilities.zoom.max + ", " + capabilities.zoom.step);
        track.applyConstraints({ advanced: [{ zoom: capabilities.zoom.max }]});
    }

    video_qr.srcObject = stream;
    video_qr.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
    video_qr.play();
    requestAnimationFrame(tick);
});
/* ---------------------------------------------------------------- */

/* ---------------------------------------------------------------- */
/* 直線描写                                                         */
/* ---------------------------------------------------------------- */
function drawLine(begin, end, color) {
    canvas_2d.beginPath();
    canvas_2d.moveTo(begin.x, begin.y);
    canvas_2d.lineTo(end.x, end.y);
    canvas_2d.lineWidth = 4;
    canvas_2d.strokeStyle = color;
    canvas_2d.stroke();
}
/* ---------------------------------------------------------------- */

/* ---------------------------------------------------------------- */
/* QR認識                                                           */
/* ---------------------------------------------------------------- */
function tick()
{
    try {
        loadingMessage.innerText = "⌛ カメラ起動中..."
        if (video_qr.readyState === video_qr.HAVE_ENOUGH_DATA) {
            loadingMessage.hidden = true;
            canvas_video.hidden = false;
            outputContainer.hidden = false;

            canvas_video.height = video_qr.videoHeight;
            canvas_video.width = video_qr.videoWidth;
            canvas_2d.drawImage(video_qr, 0, 0, canvas_video.width, canvas_video.height);

            edgeLen = canvas_video.height / 2;

            drawLine({x:canvas_video.width / 4          , y:canvas_video.height / 4          }, {x:canvas_video.width / 4          , y:canvas_video.height / 4 + edgeLen}, "#ffffff");
            drawLine({x:canvas_video.width / 4          , y:canvas_video.height / 4 + edgeLen}, {x:canvas_video.width / 4 + edgeLen, y:canvas_video.height / 4 + edgeLen}, "#ffffff");
            drawLine({x:canvas_video.width / 4 + edgeLen, y:canvas_video.height / 4 + edgeLen}, {x:canvas_video.width / 4 + edgeLen, y:canvas_video.height / 4          }, "#ffffff");
            drawLine({x:canvas_video.width / 4 + edgeLen, y:canvas_video.height / 4          }, {x:canvas_video.width / 4          , y:canvas_video.height / 4          }, "#ffffff");

            var imageData = canvas_2d.getImageData(canvas_video.width / 4, canvas_video.height / 4, edgeLen, edgeLen);

            var code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                drawLine({x:code.location.topLeftCorner.x     + canvas_video.width / 4, y:code.location.topLeftCorner.y     + canvas_video.height / 4}, {x:code.location.topRightCorner.x    + canvas_video.width / 4, y:code.location.topRightCorner.y    + canvas_video.height / 4}, "#FF3B58");
                drawLine({x:code.location.topRightCorner.x    + canvas_video.width / 4, y:code.location.topRightCorner.y    + canvas_video.height / 4}, {x:code.location.bottomRightCorner.x + canvas_video.width / 4, y:code.location.bottomRightCorner.y + canvas_video.height / 4}, "#FF3B58");
                drawLine({x:code.location.bottomRightCorner.x + canvas_video.width / 4, y:code.location.bottomRightCorner.y + canvas_video.height / 4}, {x:code.location.bottomLeftCorner.x  + canvas_video.width / 4, y:code.location.bottomLeftCorner.y  + canvas_video.height / 4}, "#FF3B58");
                drawLine({x:code.location.bottomLeftCorner    + canvas_video.width / 4, y:code.location.bottomLeftCorner.y  + canvas_video.height / 4}, {x:code.location.topLeftCorner.x     + canvas_video.width / 4, y:code.location.topLeftCorner.y     + canvas_video.height / 4}, "#FF3B58");
                outputMessage.hidden = true;
                outputData.parentElement.hidden = false;
                outputData.innerText = code.data;
                BluePrint_get();
                return true;
            } else {
                outputMessage.hidden = false;
                outputData.parentElement.hidden = true;
            }
        }

        requestAnimationFrame(tick);
    } catch (e) {
        alert(e.message);
    }
}
/* ---------------------------------------------------------------- */

function Page_init()
{
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("script.js")
            .then(function (registration)
            {
                console.log("serviceWorker registed.");
            }).catch(function (error)
            {
                alert("ServiceWorkerに対応していません。" + error);
            });
    }

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

//    const json_actions = JSON.stringify(lst_actions);
//    Action_do(json_actions);

    document.getElementById("button_scan").addEventListener("click", Scan_start);
}

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
    requestAnimationFrame(tick);
}

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
            {
                Action: "Action_ViewCard_get",
                Parameters: {
                    Mapping: [
                        { Key: { Quote: "WIP_CD" }, Html: { Quote: "outputData" } }
                    ]
                },
                ReturnTo: "qr_wip"
            },
            {
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
