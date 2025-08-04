/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { browser } from "@web/core/browser/browser";
import { downloadFile } from "@web/core/network/download";
/**
 * download.js v4.2, by dandavis; 2008-2018. [MIT] see http://danml.com/download.html for tests/usage
 * v1 landed a FF+Chrome compat way of downloading strings to local un-named files, upgraded to use a hidden frame and optional mime
 * v2 added named files via a[download], msSaveBlob, IE (10+) support, and window.URL support for larger+faster saves than dataURLs
 * v3 added dataURL and Blob Input, bind-toggle arity, and legacy dataURL fallback was improved with force-download mime and base64 support. 3.1 improved safari handling.
 * v4 adds AMD/UMD, commonJS, and plain browser support
 * v4.1 adds url download capability via solo URL argument (same domain/CORS only)
 * v4.2 adds semantic variable names, long (over 2MB) dataURL support, and hidden by default temp anchors
 *
 * Slightly modified for export and lint compliance
 *
 * @param {Blob | File | String} data
 * @param {String} [filename]
 * @param {String} [mimetype]
 */
function _download(data, filename, mimetype) {
    let self = window, // this script is only for browsers anyway...
        defaultMime = "application/octet-stream", // this default mime also triggers iframe downloads
        mimeType = mimetype || defaultMime,
        payload = data,
        url = !filename && !mimetype && payload,
        anchor = document.createElement("a"),
        toString = function (a) {
            return String(a);
        },
        myBlob = self.Blob || self.MozBlob || self.WebKitBlob || toString,
        fileName = filename || "download",
        blob,
        reader;
    myBlob = myBlob.call ? myBlob.bind(self) : Blob;

    if (String(this) === "true") {
        //reverse arguments, allowing download.bind(true, "text/xml", "export.xml") to act as a callback
        payload = [payload, mimeType];
        mimeType = payload[0];
        payload = payload[1];
    }

    if (url && url.length < 2048) {
        // if no filename and no mime, assume a url was passed as the only argument
        fileName = url.split("/").pop().split("?")[0];
        anchor.href = url; // assign href prop to temp anchor
        if (anchor.href.indexOf(url) !== -1) {
            // if the browser determines that it's a potentially valid url path:
            return new Promise((resolve, reject) => {
                let xhr = new browser.XMLHttpRequest();
                xhr.open("GET", url, true);
                configureBlobDownloadXHR(xhr, {
                    onSuccess: resolve,
                    onFailure: reject,
                    url
                });
                xhr.send();
            });
        }
    }

    //go ahead and download dataURLs right away
    if (/^data:[\w+\-]+\/[\w+\-]+[,;]/.test(payload)) {
        if (payload.length > 1024 * 1024 * 1.999 && myBlob !== toString) {
            payload = dataUrlToBlob(payload);
            mimeType = payload.type || defaultMime;
        } else {
            return navigator.msSaveBlob // IE10 can't do a[download], only Blobs:
                ? navigator.msSaveBlob(dataUrlToBlob(payload), fileName)
                : saver(payload); // everyone else can save dataURLs un-processed
        }
    }

    blob = payload instanceof myBlob ? payload : new myBlob([payload], { type: mimeType });

    function dataUrlToBlob(strUrl) {
        let parts = strUrl.split(/[:;,]/),
            type = parts[1],
            decoder = parts[2] === "base64" ? atob : decodeURIComponent,
            binData = decoder(parts.pop()),
            mx = binData.length,
            i = 0,
            uiArr = new Uint8Array(mx);

        for (i; i < mx; ++i) {
            uiArr[i] = binData.charCodeAt(i);
        }

        return new myBlob([uiArr], { type });
    }

    function saver(url, winMode) {
        if ("download" in anchor) {
            //html5 A[download]
            anchor.href = url;
            anchor.setAttribute("download", fileName);
            anchor.className = "download-js-link";
            anchor.innerText = _t("downloading...");
            anchor.style.display = "none";
            document.body.appendChild(anchor);
            setTimeout(() => {
                anchor.click();
                document.body.removeChild(anchor);
                if (winMode === true) {
                    setTimeout(() => {
                        self.URL.revokeObjectURL(anchor.href);
                    }, 250);
                }
            }, 66);
            return true;
        }

        // handle non-a[download] safari as best we can:
        if (/(Version)\/(\d+)\.(\d+)(?:\.(\d+))?.*Safari\//.test(navigator.userAgent)) {
            url = url.replace(/^data:([\w\/\-+]+)/, defaultMime);
            if (!window.open(url)) {
                // popup blocked, offer direct download:
                if (
                    confirm(
                        "Displaying New Document\n\nUse Save As... to download, then click back to return to this page."
                    )
                ) {
                    location.href = url;
                }
            }
            return true;
        }

        //do iframe dataURL download (old ch+FF):
        let f = document.createElement("iframe");
        document.body.appendChild(f);

        if (!winMode) {
            // force a mime that will download:
            url = `data:${url.replace(/^data:([\w\/\-+]+)/, defaultMime)}`;
        }
        f.src = url;
        setTimeout(() => {
            document.body.removeChild(f);
        }, 333);
    }

    if (navigator.msSaveBlob) {
        // IE10+ : (has Blob, but not a[download] or URL)
        return navigator.msSaveBlob(blob, fileName);
    }
    if (self.URL) {

        let reader = new FileReader();
        reader.onload = function (event) {
            let url = event.target.result;
            // console.log(event.target)
            // console.log(url);
            // Use the dynamic HTTP/HTTPS URL directly
            saver(url, true);
        };
        reader.readAsDataURL(blob);

    } else {
        // handle non-Blob()+non-URL browsers:
        if (typeof blob === "string" && blob.startsWith("blob:")) {
            blob = blob.slice(5); // Remove the "blob:" prefix
            // Convert blob URL to base64 string
            let xhr = new XMLHttpRequest();
            xhr.open("GET", blob);
            xhr.responseType = "blob";
            xhr.onload = function () {
                let reader = new FileReader();
                reader.onloadend = function () {
                    let base64data = reader.result;
                    try {
                        saver(`data:${mimeType};base64,${base64data}`);
                    } catch {
                        saver(`data:${mimeType},${encodeURIComponent(base64data)}`);
                    }
                };
                reader.readAsDataURL(xhr.response);
            };
            xhr.send();
        }
        else if (typeof blob === "string" || blob.constructor === toString) {
            try {
                return saver(`data:${mimeType};base64,${self.btoa(blob)}`);
            } catch {
                return saver(`data:${mimeType},${encodeURIComponent(blob)}`);
            }
        }

        // Blob but not URL support:
        // reader = new FileReader();

        // reader.onload = function () {
        //     saver(this.result);
        // };
        // reader.readAsDataURL(blob);
    }

    return true;
}

downloadFile._download = _download;
