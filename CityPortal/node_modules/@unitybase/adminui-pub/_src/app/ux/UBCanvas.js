/**
 *  Wrapper around HTML5 canvas
 */
Ext.define("UB.ux.UBCanvas", {
    /**
     * constructor
     * @param {Object} config
     * @param {Number} [config.height] (optional)
     * @param {Number} [config.width] (optional)
     * @param {String} [config.font] (optional) default "bold 12px sans-serif"
     * @param {String} [config.fillColour] (optional) default white
     */
    constructor: function(config){
        var me = this;

        config = config || {};
        me.canvasObj = document.createElement('canvas');
        me.canvasObj.style.visibility = 'hidden';
        me.canvasObj.style.display = 'none';

        if ( !Ext.isEmpty(config.width)){
            me.canvasObj.width = config.width;
        }
        if ( !Ext.isEmpty(config.height)){
            me.canvasObj.height = config.height;
        }
        this.fontsHigh = {};
        config.font = config.font || "bold 12px sans-serif";
        me.font = config.font;
        me.initContext();
        me.nofill = config.nofill || false;
        me.fillColour = config.fillColour;
        if (!me.nofill){
            me.fillCanva( me.fillColour || 'white');
        }
    },

    initContext: function(){
        var me = this;
        /**
         * Rendering context, created during call to UB.ux.UBCanvas#initContext
         * @property ctx {CanvasRenderingContext2D}
         */
        me.ctx = me.canvasObj.getContext('2d');
        me.ctx.imageSmoothingEnabled = false;
        me.ctx.webkitImageSmoothingEnabled = false;
        me.ctx.mozImageSmoothingEnabled = false;
        me.ctx.font = me.font;
        me.ctx.textBaseline = "top";
        me.isContextInit = true;
    },

    getImageBackground:  function(image) {
        var canv = document.createElement("canvas");
        canv.style.visibility = 'hidden';
        canv.style.display = 'none';
        canv.width = 1;
        canv.height = 1;
        var ctx = canv.getContext("2d");
        ctx.drawImage(image, 0, image.height -1, 1,1, 0,0, 1,1);
        var imgData= ctx.getImageData(0,0, 1, 1);
        return {
            r: imgData.data[0],
            g: imgData.data[1],
            b: imgData.data[2],
            a: imgData.data[3]
        };
    },

    /**
     * Fill canvas by background color and then draw an image
     * @param {Object} config
     * @param {String|ArrayBuffer} config.imageUrl Source image
     * @param {Boolean} [config.setSizeByImage=false] If true width & height of canvas will be set to source image width & height
     * @param {Boolean} [config.stretchToCanvas=false] If true destination image will be scaled to canvas width & heoght
     * @param {Number} [config.width] If passed destination image width will be scaled to this widht
     * @param {Number} [config.height] If passed destination image height will be scaled to this height
     * @param {Number} [config.x=0] Start pos x
     * @param {Number} [config.y=0] Start pos y
     *
     * @return {Promise}
     */
    loadImage: function(config){
        var me = this,
            newImg = new Image(), bgColourObj,
            isBlobURL = (typeof config.imageUrl === 'object') && config.imageUrl.byteLength,
            deferred = Q.defer();

        var cconfig = Ext.clone(config);
        if (cconfig.stretchToCanvas) {
            cconfig.height = me.canvasObj.height;
            cconfig.width = me.canvasObj.width;
        }

        cconfig.setBackgroundFromImage = cconfig.setBackgroundFromImage || true;

        cconfig.x = cconfig.x || 0;
        cconfig.y = cconfig.y || 0;
        newImg.onload = function() {
            if (isBlobURL) { window.URL.revokeObjectURL(this.src) }
            if (cconfig.setSizeByImage){
                me.canvasObj.width = this.width;
                me.canvasObj.height = this.height;
                me.initContext();
                cconfig.setBackgroundFromImage = false;
            }

            if (cconfig.setBackgroundFromImage){
                // define color
                bgColourObj = me.getImageBackground(this);
                if (bgColourObj.a === 0 ){
                    me.fillCanva( 'white');
                } else {
                    me.fillCanva( 'rgb(' + bgColourObj.r + ','  + bgColourObj.g +  ','  + bgColourObj.b +  ')');
                }
            }

            if (!Ext.isEmpty(cconfig.height)){
                me.ctx.drawImage(this, cconfig.x, cconfig.y, cconfig.width, cconfig.height );
            } else {
                me.ctx.drawImage(this, cconfig.x, cconfig.y);
            }

            deferred.resolve(true);
        };

        newImg.onerror = function(e){
            if (isBlobURL) { window.URL.revokeObjectURL(this.src) }
            deferred.reject(e);
        };
        if (isBlobURL) {
            newImg.src = window.URL.createObjectURL(new Blob([config.imageUrl]));
        } else {
            newImg.src = config.imageUrl;
        }
        return deferred.promise;
    },


    readCanvasData: function() {
        var me = this;
        var iWidth = parseInt( me.canvasObj.width, 10 );
        var iHeight = parseInt( me.canvasObj.height, 10 );
        return me.ctx.getImageData(0,0,iWidth,iHeight);
    },

    scaleCanvas: function(oCanvas, iWidth, iHeight) {
        if (iWidth && iHeight) {
            var oSaveCanvas = document.createElement("canvas");
            oSaveCanvas.width = iWidth;
            oSaveCanvas.height = iHeight;
            oSaveCanvas.style.width = iWidth+"px";
            oSaveCanvas.style.height = iHeight+"px";

            var oSaveCtx = oSaveCanvas.getContext("2d");

            oSaveCtx.drawImage(oCanvas, 0, 0, oCanvas.width, oCanvas.height, 0, 0, iWidth, iHeight);
            return oSaveCanvas;
        }
        return oCanvas;
    },

    createBMP: function() {
        var me = this,
            oData = me.readCanvasData(),
            aHeader = [],
            iWidth = oData.width,
            iHeight = oData.height;

        aHeader.push(0x42); // magic 1
        aHeader.push(0x4D);

        var iFileSize = iWidth*iHeight*3 + 54; // total header size = 54 bytes
        aHeader.push(iFileSize % 256); iFileSize = Math.floor(iFileSize / 256);
        aHeader.push(iFileSize % 256); iFileSize = Math.floor(iFileSize / 256);
        aHeader.push(iFileSize % 256); iFileSize = Math.floor(iFileSize / 256);
        aHeader.push(iFileSize % 256);

        aHeader.push(0); // reserved
        aHeader.push(0);
        aHeader.push(0); // reserved
        aHeader.push(0);

        aHeader.push(54); // dataoffset
        aHeader.push(0);
        aHeader.push(0);
        aHeader.push(0);

        var aInfoHeader = [];
        aInfoHeader.push(40); // info header size
        aInfoHeader.push(0);
        aInfoHeader.push(0);
        aInfoHeader.push(0);

        var iImageWidth = iWidth;
        aInfoHeader.push(iImageWidth % 256); iImageWidth = Math.floor(iImageWidth / 256);
        aInfoHeader.push(iImageWidth % 256); iImageWidth = Math.floor(iImageWidth / 256);
        aInfoHeader.push(iImageWidth % 256); iImageWidth = Math.floor(iImageWidth / 256);
        aInfoHeader.push(iImageWidth % 256);

        var iImageHeight = iHeight;
        aInfoHeader.push(iImageHeight % 256); iImageHeight = Math.floor(iImageHeight / 256);
        aInfoHeader.push(iImageHeight % 256); iImageHeight = Math.floor(iImageHeight / 256);
        aInfoHeader.push(iImageHeight % 256); iImageHeight = Math.floor(iImageHeight / 256);
        aInfoHeader.push(iImageHeight % 256);

        aInfoHeader.push(1); // num of planes
        aInfoHeader.push(0);

        aInfoHeader.push(24); // num of bits per pixel
        aInfoHeader.push(0);

        aInfoHeader.push(0); // compression = none
        aInfoHeader.push(0);
        aInfoHeader.push(0);
        aInfoHeader.push(0);

        var iDataSize = iWidth*iHeight*3;
        aInfoHeader.push(iDataSize % 256); iDataSize = Math.floor(iDataSize / 256);
        aInfoHeader.push(iDataSize % 256); iDataSize = Math.floor(iDataSize / 256);
        aInfoHeader.push(iDataSize % 256); iDataSize = Math.floor(iDataSize / 256);
        aInfoHeader.push(iDataSize % 256);

        for (var i=0;i<16;i++) {
            aInfoHeader.push(0);	// these bytes not used
        }

        var iPadding = (4 - ((iWidth * 3) % 4)) % 4;

        var aImgData = oData.data;

        var strPixelData = "";
        var y = iHeight;
        do {
            var iOffsetY = iWidth*(y-1)*4;
            var strPixelRow = "";
            for (var x=0;x<iWidth;x++) {
                var iOffsetX = 4*x;

                strPixelRow += String.fromCharCode(aImgData[iOffsetY+iOffsetX+2]);
                strPixelRow += String.fromCharCode(aImgData[iOffsetY+iOffsetX+1]);
                strPixelRow += String.fromCharCode(aImgData[iOffsetY+iOffsetX]);
            }
            for (var c=0;c<iPadding;c++) {
                strPixelRow += String.fromCharCode(0);
            }
            strPixelData += strPixelRow;
        } while (--y);

        return  this.encodeData(aHeader.concat(aInfoHeader)) + this.encodeData(strPixelData);
    },

    // base64 encodes either a string or an array of charcodes
    encodeData: function(data) {
        var strData = "";
        if (typeof data === "string") {
            strData = data;
        } else {
            var aData = data;
            for (var i=0;i<aData.length;i++) {
                strData += String.fromCharCode(aData[i]);
            }
        }
        return btoa(strData);
    },

    /**
     *
     * @param {String} imageType default 'image/jpeg'
     * @param {String} resultType default 'Base64'
     */
    getAsImageData: function(resultType, imageType){
        imageType = imageType || 'image/jpeg';
        var me = this, data;
        me.clearAlpha();
        if (imageType === 'image/bmp') {
            data = me.createBMP();
            switch (resultType) {
                case 'Base64':
                    data = "data:" + imageType + ";base64," + data;
                    break;
                case 'Base64data':
                    //data = "data:" + imageType + ";base64," + data;
                    break;
                case 'Rawdata':
                    data = atob(data);
                    break;
                case 'blob':
                    //me.canvasObj.toBlob(callback [, type, ... ])
                    break;
            }
        } else {
            data = me.canvasObj.toDataURL(imageType);
            resultType = resultType || 'Base64';
            switch (resultType) {
                case 'Base64data':
                    data = data.slice(('data:' + imageType + ';base64,').length);
                    break;
                case 'Rawdata':
                    data = data.slice(('data:' + imageType + ';base64,').length);
                    data = atob(data);
                    break;
                case 'blob':
                    //me.canvasObj.toBlob(callback [, type, ... ])
                    break;
            }
        }
        return data;
    },

    getAsBlob: function(callback, imageType){
        if (!this.canvasObj.toBlob){
            var imgData = this.getAsImageData(imageType, 'Rawdata'),
                imgLength = imgData.length,
                imgArray = new Uint8Array(new ArrayBuffer(imgLength));

            for (var i = 0; i < imgLength; i++) {
                imgArray[i] = imgData.charCodeAt(i);
            }

            var rblob = new Blob(
                [imgArray],
                {type: imageType}
            );
            callback.call(rblob );
        } else {
          this.canvasObj.toBlob(callback , imageType);
        }
    },

    /**
     *
     * @param fontParams "bold 12px sans-serif"
     */
    setFont: function ( fontParams ){
        this.font = fontParams;
        this.ctx.font = fontParams;
    },

    /**
     * Todo Посискать более красивую реализацию
     * @param font
     * @return {*}
     */
    getFontHeight: function(font) {
        var me = this;
        if (me.fontsHigh.hasOwnProperty(font)){
            return me.fontsHigh[font];
        }
        var parent = document.createElement("span");
        parent.appendChild(document.createTextNode("height"));
        document.body.appendChild(parent);
        parent.style.cssText = "font: " + font + "; white-space: nowrap; display: inline;";
        var height = parent.offsetHeight;
        document.body.removeChild(parent);
        me.fontsHigh[font] = height;
        return height;
    },

    /**
     * Return text height for current font
     * @param text
     * @param maxWidth
     * @returns {number}
     */
    getTextHeight: function(text, maxWidth){
        var me = this;
        return Math.round(me.ctx.measureText( text ).width / maxWidth ) *
            me.getFontHeight(me.ctx.font);
    },

    /**
     *
     * @param {String} text
     * @param {Number} x
     * @param {Number} y
     * @param {Object} [options] (optional)
     * @param {Number} [options.maxWidth] (optional)
     * @param {Boolean} [options.wordWrap] (optional)
     * @param {String} [options.align] One of 'left' 'right' 'center'. Default is 'left'.
     * @param {String} [options.fillStyle] (optional) CSSCOLOR 'black' or 'rgba(0,0,0,0.1)' or 'rgb(0,255,0)' or #ff0000
     * @param {Number} [options.rotate] (optional) как повернуть текст
     * @param {Number} [options.rotate.angle] (optional) угол в градусах от 0 до 360 градусов
     * @param {Number} [options.rotate.x] (optional) точка поворота
     * @param {Number} [options.rotate.y] (optional) точка поворота
     * @param {String} [options.baseline] (optional)
     * @return {Number} Next line Y position
     */
    drawText: function(text, x, y, options){
        var me = this, nx, lineWidth, result = y,
        ctx = me.ctx;
        options = options || {};
        if (options.rotate){
          ctx.save();
           // ctx.translate(0,0);
          ctx.translate(options.rotate.x,options.rotate.y);
          ctx.rotate( Math.PI * options.rotate.angle/ 180);
          //  ctx.rotate(Math.PI * 2/6);
        }

        ctx.font = this.font;
        ctx.textBaseline = "top";

        if (options.baseline) { ctx.textBaseline = options.baseline; }
        //if (options.align) { ctx.textAlign = options.align; }
        if (options.font) { ctx.font = options.font; }
        me.ctx.fillStyle = options.fillStyle || "black";

        ctx.textAlign = 'left';

        if (!Ext.isEmpty(options.maxWidth)){
            options.align = options.align || 'left';
            if (options.align === 'right') {
                ctx.textAlign = 'right';
            }
            if (options.wordWrap){
                result =  me.internalWrapText(text, x, y, options.maxWidth, me.getFontHeight(ctx.font), options.align );
            } else {
                nx = x;
                lineWidth = ctx.measureText(text).width;
                if (lineWidth < options.maxWidth) {
                    switch (options.align) {
                        case 'right':
                            nx = x + options.maxWidth ; break;
                        case 'center':
                            nx = (options.maxWidth - lineWidth) / 2 ; break;
                    }
                }
                ctx.fillText(text, nx, y, options.maxWidth);
            }
        } else {
            ctx.fillText(text, x, y);
        }

        if (options.rotate){

          ctx.restore();
        }
        return result + me.getFontHeight(ctx.font);
    },

    internalWrapText: function ( text, x, y, maxWidth, lineHeight, align)
    {
        var me = this, words, countWords, line, n, testLine, testWidth, nx,
            ctx = me.ctx;
        text = text || '';
        words =  text.split(' ');
        countWords = words.length;
        line = '';

        function corAlign(){
            nx = x;
            switch (align) {
                case 'right': nx = x + maxWidth ; break;
                case 'center': nx = (maxWidth - ctx.measureText(line).width) / 2 ; break;
            }
        }

        for ( n = 0; n < countWords; n++) {
             testLine = line + words[n] + ' ';
             testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxWidth) {
                corAlign();
                ctx.fillText(line, nx, y);
                line = words[n] + " ";
                y += lineHeight;
            }
            else {
                line = testLine;
            }
        }
        corAlign();
        ctx.fillText(line, nx, y);
        return y;
    },

    /**
     * изменние размера приводит к очистке канвы
     * @param {Number} height
     * @param {Number} width
     */
    setCnvaSize: function(height, width){
        var me = this;
        var fChanged = false;
        if ( !Ext.isEmpty(width)){
            me.canvasObj.width = width;
            fChanged = true;
        }
        if ( !Ext.isEmpty(height)){
            me.canvasObj.height = height;
            fChanged = true;
        }
        if (fChanged){
            this.initContext();
        }
    },

    /**
     * Make Canvas full transparent
     */
    clearAlpha: function(){
        var
            me = this,
            ctx = me.ctx,
            imgData=ctx.getImageData(0,0,me.canvasObj.width,me.canvasObj.height),
            L = imgData.data.length;
        for (var i=0; i <L; i+=4){
            imgData.data[i+3]=255;
        }
        ctx.putImageData(imgData, 0, 0);
    },

    /**
     * Fill all canva by specified color
     */
    fillCanva: function(colour){
        var me = this, ctx = me.ctx;
        ctx.rect(0, 0, me.canvasObj.width, me.canvasObj.height);
        ctx.fillStyle = colour;
        ctx.fill();
    }
});