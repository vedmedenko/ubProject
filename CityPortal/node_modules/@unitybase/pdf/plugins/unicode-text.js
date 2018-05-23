/*global jsPDF,require,DOMParser */
/*
 */
;(function (jsPDFAPI) {
    var /////////////////////
    // Private functions
    /////////////////////
    // simplified (speedier) replacement for sprintf's %.2f conversion
        f2 = function (number) {
            return number.toFixed(2);
        }, // simplified (speedier) replacement for sprintf's %.3f conversion
        outPage = function (data, pageNumber, context) {
            if (context.pages.length < pageNumber) {
                throw new Error('pageNumber out or range pages. Page = ' + pageNumber + ' Pages=' + context.pages.length);
            }
            context.pages[pageNumber].push(data);
        };

    jsPDF.UnicodeFonts = [];
    //jsPDFAPI.innerFonts = [];

    /**
     *
     * @param fontName
     * @param fontStyle
     * @returns {boolean}
     * @constructor
     */
    jsPDFAPI.UnicodeFontExists = function (fontName, fontStyle) {
        var f,
            l=jsPDF.UnicodeFonts.length;

        for (var i = 0; i < l; i++) {
            f = jsPDF.UnicodeFonts[i];
            if (f.fontName === fontName && f.fontStyle === fontStyle) {
                return true;
            }
        }
        return false;
    };

    /**
     *
     * @param {String} name
     * @param {String} htmlName
     */
    jsPDFAPI.addHtmlFontName = function (name, htmlName) {
        if (!name || !htmlName){
            return;
        }
        if (!this.fontHmlNames) {
            this.fontHmlNames = {};
        }
        if (!this.fontHmlNames[htmlName]){
            this.fontHmlNames[htmlName] = name;
        }
    }

    /**
     *
     * @param {String} htmlName
     * @returns {String}
     */
    jsPDFAPI.getFontNameByHtmlName = function (htmlName) {
        if (!htmlName){
            return htmlName
        }
        var res = null, me = this
        htmlName.toLowerCase().split(',').every(function(name){
            let xName = name.trim();
            if (xName[0] === '"'){
                xName = xName.substring(1, xName.length - 1)
            }
            if (!me.fontHmlNames){
                if (me.fontNames){
                    res = me.fontNames[xName];
                    return !res;
                }
                return true;
            }
            res = me.fontHmlNames[xName];
            return !res;
        })
        return res || htmlName;
    }


    jsPDFAPI.parseFont = function (data) {
        var res;
        data.data = atob(data.data);
        data.toUnicodeCMapData = atob(data.toUnicodeCMapData);

        data.fontMetric = {};
        data.fontMetric.ascent = 0;
        data.fontMetric.descent = 0;
        if (data.descriptor) {

            res = /\/Ascent [0-9]+/.exec(data.descriptor);
            if (res && res.length > 0) {
                data.fontMetric.ascent = parseInt(res[0].substr(8), 10);
            }
            res = /\/Descent [0-9-]+/.exec(data.descriptor);
            if (res && res.length > 0) {
                data.fontMetric.descent = parseInt(res[0].substr(9), 10);
            }
            if (data.fontMetric.ascent === undefined || isNaN(data.fontMetric.ascent)) {
                throw new Error('Not found descriptor "Ascent" for font');
            }
            if (data.fontMetric.descent === undefined || isNaN(data.fontMetric.descent)) {
                throw new Error('Not found descriptor "Descent" for font');
            }
        }
        if (data.fontMetric.ascent + data.fontMetric.descent <= 0) {
            data.fontMetric.ascent = data.fontBBox.UpperRightY;
        }

        data.fontMetric.ascentDelta = data.ascentDelta || 0;
        if (data.fontHtmlName) {
            if (!this.fontHmlNames) {
                this.fontHmlNames = {};
            }
            if (!this.fontHmlNames[data.fontHtmlName]){
                this.fontHmlNames[data.fontHtmlName] = data.fontName;
            }
        }

        //descriptor : "<</Type/FontDescriptor/Ascent 750/CapHeight 631/Descent -250/FontBBox


        var widths = data.width,
            widthsEx = data.widthsEx = {},
            widthsFractionOf = widths.fof ? widths.fof : 1,
            kerning = data.kerning || {},
            kerningEx = data.kerningEx = {},
            kerningFractionOf = kerning.fof ? kerning.fof : 1;

        _.forEach(widths, function(width, charCode){
            widthsEx[charCode] = width/ widthsFractionOf;
        });
        _.forEach(kerning, function(kern, charCode){
            var kc = kerningEx[charCode] = {};
            _.forEach(kern, function(value, prevCharCode){
                kc[prevCharCode] = value / kerningFractionOf;
            });
        });
        data.width = {fof: widths.fof || 1};
        data.kerning = {fof: kerning.fof || 1};
    };


    jsPDFAPI.addRawFontData = function (data) {
        var
            f, l;

        if ((!data.fontName || (typeof data.fontName) !== 'string') || (!data.fontStyle || (typeof data.fontStyle) !== 'string')) {
            throw new Error('Invalid font data');
        }
        if (!this.fontNames) {
            this.fontNames = {};
        }
        this.fontNames[data.fontName.toLowerCase()] = data.fontName;
        l = jsPDF.UnicodeFonts.length;
        for (var i = 0; i < l; i++) {
            f = jsPDF.UnicodeFonts[i];
            if (f.fontName === data.fontName && f.fontStyle === data.fontStyle) {
                throw new Error(['Font with fontName="', f.fontName, '" and fontStyle="', f.fontStyle, '" already exists'].join());
            }
        }
        jsPDFAPI.parseFont(data);
        jsPDF.UnicodeFonts.push(data);
    };

    jsPDFAPI.events.push([
        'initialized', function () {
            this.internal.textColorExt = '0 g';
        }
    ]);

    jsPDFAPI.WriteStream = function (data, pLen) {
        var
            out = this.internal.write, streamH;
        if (pLen !== data.length) {
            streamH = "<</Filter/FlateDecode/Length " + data.length.toString() + "/Length1 " + pLen.toString() + ">>stream";
        } else {
            streamH = "<</Length " + data.length.toString() + "/Length1 " + data.length.toString() + ">>stream";
        }
        out(streamH);
        out(data);
        out('endstream');
    };

    jsPDFAPI.WriteStreamFlate = function (data) {
        var
            out = this.internal.write, compressed;
        compressed = data;
        //var zpipe = require("zpipe");
        //var ss = zpipe.deflate("a")
        //var ssr = zpipe.inflate(ss)
        //var compressed = zpipe.deflate(data)
        //var  ssss = zpipe.inflate(compressed)
        //z =  null;

        var streamH = "<</Filter/FlateDecode/Length " + data.length.toString() + "/Length1 " + compressed.length.toString() + ">>stream";
        out(streamH);
        out(compressed);
        out('endstream');
    };


    jsPDFAPI.fontWidth = "";

    jsPDFAPI.events.push([
        'addFonts', function (fontManagementObjects) {
            var
                cFont, fontKey, font, fontmap, l;
            this.innerFonts = fontManagementObjects.fonts;
            fontmap = fontManagementObjects.dictionary;

            function AddFontToMap(fontmap, fontName, fontStyle, fontKey) {
                var fname = fontName.toLowerCase(),
                    fstyle = fontStyle;
                if (_.isUndefined(fontmap[fname])) {
                    fontmap[fname] = {}; // fontStyle is a var interpreted and converted to appropriate string. don't wrap in quotes.
                }
                fontmap[fname][fstyle] = fontKey;
            }

            l = jsPDF.UnicodeFonts.length;
            for (var i = 0; i < l; i++) {
                cFont = jsPDF.UnicodeFonts[i];

                fontKey = 'F' + ( Object.keys(this.innerFonts).length + 1).toString();

                font = this.innerFonts[fontKey] = {
                    'id': fontKey,
                    // , 'objectNumber':   will be set by putFont()
                    'PostScriptName': cFont.postScriptName,
                    'fontName': cFont.fontName,
                    'fontStyle': cFont.fontStyle,
                    'encoding': 'StandardEncoding',
                    'metadata': {Unicode: {
                         widths: cFont.width ? cFont.width : {},
                         kerning: cFont.kerning ? cFont.kerning : {},
                         widthsEx: cFont.widthsEx || {},
                         kerningEx: cFont.kerningEx || {},
                         encoding: 'StandardEncoding'
                       }
                    },
                    'extFont': cFont
                };

                cFont.Key = fontKey;
                cFont.fontObj = font;

                //delete this.innerFonts[fontKey]

                //fontManagementObjects.fonts[fontKey].
                AddFontToMap(fontmap, cFont.fontName, cFont.fontStyle, fontKey);
                if (cFont.fontName.toLowerCase() === 'arial') {
                    // обход идиотско логиги в jsPdf
                    AddFontToMap(fontmap, 'helvetica', cFont.fontStyle, fontKey);
                }

            }
        }
    ]);


    jsPDFAPI.events.push([
        'putResources', function (prm) {
            var out = this.internal.write, //ffont = this.internal.getFont(), //, activeFontKey = ffont.id
                usedUnicodeFonts = this.internal.usedUnicodeFonts,
                scripts = this.internal.JavaScripts,
                cFont,
                l = jsPDF.UnicodeFonts.length,
                streamobj, descriptorobj, initobj, toUnicodeCMapDataobj, allScript;

            usedUnicodeFonts = !usedUnicodeFonts ? [] : usedUnicodeFonts;

            for (var i = 0; i < l; i++) {
                cFont = jsPDF.UnicodeFonts[i];
                if (usedUnicodeFonts.indexOf(cFont.Key) >= 0) {

                    this.innerFonts[cFont.Key] = cFont.fontObj;

                    // write font data
                    streamobj = this.internal.newObject();
                    this.WriteStream(cFont.data, cFont.dataLen);
                    out('endobj');

                    descriptorobj = this.internal.newObject();
                    out(cFont.descriptor.replace(/<<-fileobj->>/, streamobj));
                    out('endobj');

                    initobj = this.internal.newObject();
                    out(cFont.init.replace(/<<-Descrobj->>/, descriptorobj));
                    out('endobj');

                    toUnicodeCMapDataobj = this.internal.newObject();
                    this.WriteStream(cFont.toUnicodeCMapData, cFont.toUnicodeCMapDataLen);
                    out('endobj');

                    var toUnicodeCMapobj = this.internal.newObject();
                    out(cFont.toUnicodeCMap.replace(/<<-initobj->>/, initobj).replace(/<<-TUCMobj->>/, toUnicodeCMapDataobj));
                    out('endobj');

                    cFont.fontObj.objectNumber = toUnicodeCMapobj;
                    cFont.isDeleted = false;
                } else {
                    delete this.innerFonts[cFont.Key];
                    //this.innerFonts[cFont.Key] = null;
                    cFont.isDeleted = true;
                }
            }
            usedUnicodeFonts.splice(0, usedUnicodeFonts.length);
            if (scripts && (scripts instanceof Array) && scripts.length > 0) {
                this.internal.scriptsObj = this.internal.newObject();
                allScript = scripts.join('\r\n');
                out('<</Length ' + allScript.length.toString() + '>>stream');
                out(allScript);
                out('endstream');
                out('endobj');
            }
        }
    ]);


    jsPDFAPI.AddJavaScript = function (script) {
        if (!this.internal.JavaScripts) {
            this.internal.JavaScripts = [];
        }
        this.internal.JavaScripts.push(script);
    };

    jsPDFAPI.events.push([
        'OnOpenAction', function () {
            var out = this.internal.write, scriptsObj = this.internal.scriptsObj;

            if (!scriptsObj || (scriptsObj.length === 0)) {
                out('[3 0 R /FitH null]');
            } else {
                out('<</S/JavaScript/JS ' + scriptsObj.toString() + ' 0 R  /Next [3 0 R /FitH null]>>');
            }
        }
    ]);

    jsPDFAPI.events.push([
        'putXobjectDict', function () {
            var i, l = jsPDF.UnicodeFonts.length, cFont;
            for (i = 0; i < l; i++) {
                cFont = jsPDF.UnicodeFonts[i];
                if (cFont.isDeleted) {
                    this.innerFonts[cFont.Key] = cFont.fontObj;
                    cFont.isDeleted = false;
                }
                //delete innerFonts[cFont.Key]
            }
        }
    ]);

    jsPDFAPI.addExtFonts = function () {
//        var out = this.internal.write;

        //debugger;
        //this.setTextColor(1,1,1);
        return this;
    };

    // moved from split_text_to_size
    //*******************

    var getArraySum = function (array) {
        var i = array.length, output = 0;
        while (i--) {
            output += array[i] || 0;
        }
        return output;
    };
    /**
     Returns a widths of string in a given font, if the font size is set as 1 point.

     In other words, this is "proportional" value. For 1 unit of font size, the length
     of the string will be that much.

     Multiply by font size to get actual width in *points*
     Then divide by 72 to get inches or divide by (72/25.6) to get 'mm' etc.

     @public
     @function
     @param text
     @param {Object} options
     @returns {Type}
     */
    var getStringUnitWidth = jsPDFAPI.getStringUnitWidthEx = function (text, options) {
        return getArraySum(jsPDFAPI.getCharWidthsArray.call(this, text, options));
    };


    /**
     * Return chars width
     * @param {String} text
     * @param {String} fontId
     * @returns {Array}
     */
    jsPDFAPI.getCharWidthsArrayEx = function(text, fontId){
        var font = this.innerFonts[fontId],
            widths = font.metadata.Unicode.widthsEx,
            kerning = font.metadata.Unicode.kerningEx;

        var i, l, char_code, char_width,
            prior_char_code = 0, // for kerning
            default_char_width = widths[0],
            output = [];

        for (i = 0, l = text.length; i < l; i++) {
            char_code = text.charCodeAt(i);
            output.push(
                (widths[char_code] || default_char_width)  +
                     ( (kerning[char_code] && kerning[char_code][prior_char_code]) || 0 )
            );
            prior_char_code = char_code;
        }

        return output;
    };


    /**
     returns array of lines
     */
    var splitLongWord = function (word, widths_array, firstLineMaxLen, maxLen, details, options) {
        var answer = [], rWord,
            lineDetail = details ? details[details.length - 1] : null,
            i = 0, l = word.length, workingLen = 0, ch;

        // 1st, chop off the piece that can fit on the hanging line.
        while (i !== l && workingLen + (ch = fontPointToUnit(widths_array[i], options.fsize, options.scaleFactor)) < firstLineMaxLen) {
            workingLen += ch;
            i++;
        }
        // this is first line.
        answer.push(rWord = word.slice(0, i));
        if (lineDetail) {
            lineDetail.words.push(rWord);
            lineDetail.wordLen.push(fontPointToUnit(workingLen, options.fsize, options.scaleFactor));
        }

        // 2nd. Split the rest into maxLen pieces.
        var startOfLine = i;
        workingLen = 0;
        while (i !== l) {
            ch = fontPointToUnit(widths_array[i], options.fsize, options.scaleFactor);
            if (workingLen + ch > maxLen) {
                answer.push(rWord = word.slice(startOfLine, i));
                if (lineDetail) {
                    lineDetail = { words: [rWord], wordLen: [workingLen]};
                    details.push(lineDetail);
                }

                workingLen = 0;
                startOfLine = i;
            }
            workingLen += ch;
            i++;
        }
        if (startOfLine !== i) {
            answer.push(rWord = word.slice(startOfLine, i));
            if (lineDetail) {
                lineDetail = { words: [rWord], wordLen: [workingLen]};
                details.push(lineDetail);
            }
        }

        return answer;
    };

    var fontPointToUnit = function (size, fontSize, scaleFactor) {
        return 1.0 * size * fontSize; /// scaleFactor;
    };

    // moved from split_text_to_size

    /**
     *
     * Split text by lines and put detail information.
     *
     * @param {Object} textInfo (PdfTextInfo)
     * @param {Number| null} maxTextLen
     */
    jsPDFAPI.prepareLines = function (textInfo, maxTextLen) {
        var
            lineLen, separatorLen, currentWordLen, block, lineNum = 0, line, maxlen, pLine;

        if ((textInfo === undefined) || (textInfo === null) || textInfo.isTextInfo !== true) {
            throw new Error('Invalid parameter textInfo');
        }

        //maxlen = 1.0 * this.internal.scaleFactor * maxTextLen / fsize
        //Convert to "point" measure
        maxlen = (maxTextLen || 0) * this.internal.scaleFactor;
        textInfo.lineCount = 0;
        //textInfo.lines = [];
        textInfo.textIndent = [];
        textInfo.details = [];

        function createNewLine(newParagraph) {
            var d;
            resetLine();
            if (newParagraph) {
                d = textInfo.details[lineNum] || {};
                d.isStartParagraph = true;
                textInfo.details[lineNum] = d;
            }
        }

        function resetLine() {
            line = {
                words: [],
                wordLen: []
                // xmax not used,wordChars: []
            };
        }

        function endParagraph() {
            var d = textInfo.details[lineNum - 1 ] || {};
            d.isEndParagraph = true;
            textInfo.details[lineNum - 1 ] = d;
        }

        function putLine(textIndent) {
            block.lines[lineNum] = line;
            if (block.startLineNum === undefined) {
                block.startLineNum = lineNum;
            }
            block.endLineNum = lineNum;
            textInfo.textIndent[lineNum] = textIndent || 0;
            //textInfo.lines[lineNum] = (textInfo.lines[lineNum] ? textInfo.lines[lineNum] + ' ' : '') + line.words.join(' ');
        }

        function appendLine(textIndent) {
            if (line.words.length > 0) {
                putLine(textIndent);
            }
            lineNum++;
            pLine++;
        }

        function pushLine(word, wChars, wLen) {
            var wordLen = wLen ? wLen : (wChars ? fontPointToUnit(getArraySum(wChars), block.font.size) : 0);
            line.words.push(word);
            line.wordLen.push(wordLen);
            // xmax not used line.wordChars.push(wChars || []);
            lineLen += lineLen = 0 ? 0 : separatorLen + wordLen;
            line.length = lineLen;
        }

        var p, b,  pNum, blockNum, item, w, index,
            wordChars, lastW, currW, startP, tmp;
        for( pNum = 0; pNum < textInfo.paragraphs.length; pNum++ ){
            p = textInfo.paragraphs[pNum];
            separatorLen = 0;
            createNewLine(true);
            lineLen = 0;
            pLine = 0;

            for( blockNum = 0; blockNum < p.blocks.length; blockNum++ ){
                b = p.blocks[blockNum];
                //block = paragraph.newBlock('', b.font.font.fontName, b.font.font.fontStyle, b.font.size, b.font.color);
                resetLine();
                block = b;
                p.lineCount = lineNum;
                block.lines = {};

                for( index = 0; index < b.words.length; index++ ){
                    w = b.words[index];

                    wordChars = b.wordChars[index] || [];
                    startP = 0;

                    currentWordLen = b.wordLen[index] || 0;
                    if ((lineLen + separatorLen + currentWordLen +
                        (p.textIndent > 0 && pLine === 0? p.textIndent: 0) > maxlen) && (maxlen > 0)) {
                        if ((currentWordLen > maxlen) && (maxlen > 0) && (w.length > 1)) {
                            // this happens when you have space-less long URLs for example.
                            // we just chop these to size. We do NOT insert hiphens
                            tmp = splitLongWord(w, wordChars, maxlen - (lineLen + separatorLen), maxlen, null, b.options);

                            // first line we add to existing line object
                            lastW = tmp.shift();
                            if (lastW !== '') { // if current line is not full
                                pushLine(lastW, wordChars.slice(startP, lastW.length));
                                startP += lastW.length;
                            }

                            appendLine((p.textIndent > 0 && pLine === 0? p.textIndent: 0));
                            // last line we make into new line object
                            currW = tmp.pop();

                            // lines in the middle we appended to lines object as whole lines
                            while (tmp.length) {
                                lastW = tmp.shift(); // single fragment occupies whole line
                                createNewLine();
                                lineLen = 0;
                                pushLine(lastW, wordChars.slice(startP, startP + lastW.length));
                                startP += lastW.length;
                                appendLine();
                            }
                            // last line
                            createNewLine();
                            lineLen = 0;
                            pushLine(currW, wordChars.slice(wordChars.length - currW.length, wordChars.length - currW.length + currW.length));
                            currentWordLen = line.wordLen[0];
                        } else {
                            appendLine((p.textIndent > 0 && pLine === 0? p.textIndent: 0));
                            createNewLine();
                            lineLen = 0;
                            pushLine(w, wordChars, currentWordLen);
                        }
                        separatorLen = b.spaceCharWidth;
                    } else {
                        separatorLen = b.spaceCharWidth;
                        pushLine(w, wordChars, currentWordLen);
                    }
                }
                if (line.words.length > 0) {
                    putLine((p.textIndent > 0 && pLine === 0? p.textIndent: 0));
                    resetLine();
                }
            }
            appendLine((p.textIndent > 0 && pLine === 0? p.textIndent: 0));
            createNewLine();
            endParagraph();
            p.lineCount = lineNum - p.lineCount;
        }
        textInfo.lineCount = lineNum;
    };

    function PdfTextInfo() {
        this.paragraphs = [];
        this.isTextInfo = true;
    }

    function PdfTextInfoParagraph() {
        this.blocks = [];
    }

    /**
     *
     * @param {String} text
     * @param {String} fontName
     * @param {String} fontStyle
     * @param {Number} size
     * @param {String|Object} color
     * @param {String} align
     * @param {Object} ctx
     * @constructor
     */
    function PdfTextInfoBlock(text, fontName, fontStyle, size, color, align, ctx) {
        var font, defaultFont, defaultFontSize, defaultColor;

        defaultFont = ctx.internal.getFont();
        defaultFontSize = ctx.internal.getFontSize();
        defaultColor = ctx.internal.textColorExt || '0 g';


        if (fontStyle && fontStyle.length > 0){
            switch (fontStyle){
                case 'Bolditalic':
                case 'bolditalic':
                    fontStyle = 'BoldItalic'
                    break;
                default:
                    fontStyle = fontStyle[0].toUpperCase() + fontStyle.substr(1)
            }
        }

        if (fontName || fontStyle) {
            font = ctx.internal.getFont(fontName || defaultFont.fontName, fontStyle || defaultFont.fontStyle);
        }
        if (!font) {
            font = defaultFont;
        }
        if (!font.extFont){
            throw new Error('Unknown font "' + fontName  || '' + '", "' + fontStyle || '' + '"');
        }

        function getOptions(forFont) {
            var //widths = {0: 1, fof: 1000 }, kerning = {},
                font = forFont || defaultFont;


            if (font.metadata.Unicode) {
                return {
                    widths: { fof: font.metadata.Unicode.widths.fof },
                    //widths: font.metadata.Unicode.widths || widths,
                    //kerning: font.metadata.Unicode.kerning || kerning,
                    fsize: size || defaultFontSize,
                    scaleFactor: ctx.internal.scaleFactor
                };
            }


            // then use default values
            return {
                //widths: widths,
                //kerning: kerning,
                fsize: font.size,
                scaleFactor: ctx.internal.scaleFactor
            };
        }


        this.text = text || '';
        this.font = {
            //font: font || defaultFont,
            fontName: font.fontName,
            fontStyle: font.fontStyle,
            id: font.id,
            size: size || defaultFontSize,
            color: color || defaultColor
        };
        //this.bigAss = new Array(1000000).join('lalala');
        this.align = align;
        this.words = [];
        this.wordChars = [];
        this.wordLen = [];
        this.options = getOptions(font);
        //this.spaceCharWidth = fontPointToUnit(jsPDFAPI.getCharWidthsArray(' ', this.options)[0], this.font.size);
        this.spaceCharWidth = fontPointToUnit(jsPDFAPI.getCharWidthsArrayEx.call(ctx, ' ', font.id)[0], this.font.size);
    }


    PdfTextInfoBlock.prototype.isEqualFontStyle = function(newFont){
        return this.font.color === newFont.color &&
            this.font.fontName === newFont.fontName &&
            this.font.fontStyle === newFont.fontStyle &&
            this.font.size === newFont.size;
    };

    PdfTextInfoBlock.prototype.fontToTag = function(){
        //return '<font name="' + this.font.fontName + '" style="' + this.font.fontStyle + '"  size="' + this.font.size +
        //    '" color="' + rgbColorToHex(this.font.color) + '">';
        return '<span style="font-family:' + this.font.fontName +
            ((this.font.fontStyle.toLowerCase() === 'italic')? ';font-style:': ';font-weight:') + this.font.fontStyle +
            ';font-size:' +
            this.font.size + 'px;color:' + rgbColorToHex(this.font.color) + '" >';
    };

    /**
     *
     */
    PdfTextInfo.prototype.updateParagraphFormat = function (ctx) {
        var nSize;
        /*
         _.forEachRight(me.paragraphs, function(p, pIdx){
         _.forEachRight(p.blocks, function(b, bIdx){
         if (!b.text){
         p.blocks.splice(bIdx, 1);
         }
         });
         if (p.blocks.length === 0){
         me.paragraphs.splice(pIdx, 1);
         }
         });
         */

        for (var i = 0; i < this.paragraphs.length; i++) {
            var currP, b, p;

            currP = this.paragraphs[i];
            b = currP.blocks[0];

            if ((b.text === '' && currP.blocks.length === 1) || currP.noIndent) {
                continue;
            }

            p = new PdfTextInfoParagraph();

            p.isIndent = true;
            nSize = Math.round((b.font.size || 8) / 6);
            nSize = nSize < 1 ? 1 : nSize;
            p.newBlock(ctx, '', b.font.name, b.font.type, nSize);
            // and footer
            this.paragraphs.splice(i, 0, p);
            p = new PdfTextInfoParagraph();
            p.isIndent = true;
            p.newBlock(ctx, '', b.font.name, b.font.type, nSize);
            this.paragraphs.splice(i + 2, 0, p);
            i += 2;
        }

        /*
         var p = this.paragraphs[this.paragraphs.length - 1],
         b = p.blocks[p.blocks.length - 1];
         if (!b.text){
         p.blocks.splice(p.blocks.length - 1, 1);
         if (p.blocks.length === 0){
         this.paragraphs.splice(this.paragraphs.length - 1, 1);
         }
         }
         */
    };

    /**
     *
     * @param {Boolean} createBlock
     * @param {Object} ctx
     * @returns {PdfTextInfoParagraph}
     */
    PdfTextInfo.prototype.newParagraph = function (createBlock, ctx) {
        var p = new PdfTextInfoParagraph();
        this.paragraphs.push(p);
        if (createBlock) {
            p.newBlock(ctx);
        }
        return p;
    };


    var entityTable = {
        34 : 'quot',
        38 : 'amp',
        39 : 'apos',
        60 : 'lt',
        62 : 'gt'
    };

    var RE_entity = /[\u0022-\u003E\u00A0-\u00FF\u0152-\u0153\u0160-\u0161\u0178\u0192\u02C6\u02DC\u0391-\u03D2<>\&]/g; //\u00A0-\u2666

    function escapeXmlEntities(text) {
        // U+0022 - U+003E,  U+00A0 - U+00FF,
        // U+0152 - U+0153, U+0160 - U+0161, U+0178, U+0192, U+02C6, U+02DC, U+0391 - U+03D2, U+03D6
        // .....
        ///[\u00A0-\u2666<>\&]/g

        return text.replace(RE_entity, function(c) {
            return '&' +
                (entityTable[c.charCodeAt(0)] || '#'+c.charCodeAt(0)) + ';';
        });
    }


    /**
     * Get some lines from text
     * @param {Number} lineFrom
     * @param {Number} lineTo
     * @param {Boolean} isXml true - the result will be xml
     * @param {Boolean} [isNotFirst]
     * @returns {string}
     */
    PdfTextInfo.prototype.getLineSource = function(lineFrom, lineTo, isXml, isNotFirst){
        var p, b, pN, bN, lKey, lN, styleText = '',
            lNum, result = [], lText=[],  pText = [], lastFont, wasIndent = 0, align ;

        for(pN = 0; pN < this.paragraphs.length; pN++ ){
            p = this.paragraphs[pN];
            if (p.isIndent){
                wasIndent += 1;
                continue;
            }
            pText = [];
            align = null;
            for(bN = 0; bN < p.blocks.length; bN++ ){
                b = p.blocks[bN];
                if (b.text === '' ){ //&& (p.blocks.length > 1 || bN > 0)
                    continue;
                }
                if (b.align){
                    align = b.align;
                }
                lKey = Object.keys(b.lines);
                lText = [];
                for(lN = 0; lN < lKey.length; lN++ ){
                    lNum = parseInt(lKey[lN],10);
                    if (lineFrom <= lNum && lineTo >= lNum){
                        lText.push( isXml ?  escapeXmlEntities(b.lines[lNum].words.join(' ')): b.lines[lNum].words.join(' ')  );
                    }
                }
                if (lText.length > 0){
                    if (isXml){
                        if (!b.isEqualFontStyle(lastFont || {})){
                            pText.push( (lastFont ? '</span>': '') + b.fontToTag() );
                        }
                        lastFont = b.font;
                    }
                    pText.push( lText.join(' ') );
                }
            }
            if (lastFont && pText.length > 0){
                pText.push( '</span>' );
            }
            lastFont = null;
            if (pText.length > 0){
                pText = pText.join('');
                if (p.textIndent && !isNotFirst){
                   styleText += 'text-indent: ' + p.textIndent + 'px; ';
                }
                if (align){
                    styleText += 'text-align: ' + align + '; ';
                }
                /*
                result.push( isXml?
                     ( wasIndent > 0 ? (styleText ? '<p style="' + styleText +  '">': '<p>') + pText + '</p>' :
                          pText  ):
                     (result.length > 0 ? '\r\n' + pText: pText)
                );
                */
                result.push( isXml?
                    ( (styleText ? '<p style="' + styleText +  '">': '<p>') + pText + '</p>' ):
                    (result.length > 0 ? '\r\n' + pText: pText)
                );

                wasIndent = -1; // для отступа снизу
            }
        }
        return result.join('');
    };


    /**
     *
     * @param {String} text
     * @param {String} fontName
     * @param {String} fontStyle
     * @param {Number} size
     * @param {String|Object} [color]
     * @param {String} [align]
     * @param {Object} ctx
     * @returns {PdfTextInfoBlock}
     */
    PdfTextInfoParagraph.prototype.newBlock = function (ctx, text, fontName, fontStyle, size, color, align) {
        var b = new PdfTextInfoBlock(text, fontName, fontStyle, size, color, align, ctx);
        this.blocks.push(b);
        return b;
    };

    /**
     * check require new block
     * @param {Object} ctx
     * @param {PdfTextInfoBlock} block
     * @param {String} text
     * @param {String} fontName
     * @param {String} fontStyle
     * @param {Number} size
     * @param {String} color
     * @param {String} align
     * @returns {PdfTextInfoBlock}
     */
    PdfTextInfoParagraph.prototype.checkBlock = function (ctx, block, text, fontName, fontStyle, size, color, align){
        if (block.font.fontName !== fontName ||
            block.font.fontStyle !== fontStyle ||
            block.font.size !== size ||
            block.font.color !== color ||
            block.align !== align){
              return this.newBlock(ctx, text || '', fontName, fontStyle, size, color, align);
        }
        return block;
     };


    /**
     * Create exemplar of class "PdfTextInfo" for store parsed text
     * @returns {Object}
     * It is class for store parsed text for PDF
     */
    jsPDFAPI.newTextInfo = function () {
        return new PdfTextInfo();
    };


    jsPDFAPI.getMeasure = function(){
        if (this.measure){
            return this.measure;
        }
        switch (this.internal.scaleFactor){
            case 1: this.measure = 'px'; break;
            case 72 / 25.4000508: this.measure = 'mm'; break;
            case 72 / 25.4: this.measure = 'mm'; break;
            case 72 / 2.54000508: this.measure = 'cm'; break;
            case 72 / 2.54: this.measure = 'cm'; break;
            case 72 : this.measure = 'in'; break;
            default: throw new Error('uncknown measure.');
        }
        return this.measure;
    };

    /**
     *
     * @param {Number|null} value
     * @param {String} measure
     * Possible values mm, cm, px, pt
     * @param {String} measureTo
     * Possible values mm, cm, px, pt
     * @returns {Number}
     */
    jsPDFAPI.convertToMeasure = function(value, measure, measureTo){
        var k;
        if (!value){
            return value;
        }
        if (!measure){
            measure = this.getMeasure();
        }
        if (!measureTo){
            measureTo = this.getMeasure();
        }
        switch(measure){
            case 'px':
            case 'pt':
                switch(measureTo){
                    case 'px':
                    case 'pt':
                        return value;
                    case 'mm':
                        //k = 72 / 25.4;
                        return value * 25.4 / 72;
                    case 'cm':
                        //k = 72 / 2.54;
                        return value *  2.54 / 72;
                    default:
                        throw new Error('Unknown measure ' + measureTo);
                }
                break;
            case 'cm':
            case 'mm':
                switch(measureTo){
                    case 'px':
                    case 'pt':
                        //k = 72 / 25.4;
                        return value * 72/ (measureTo === 'cm' ? 2.54: 25.4);
                    case 'mm':
                    case 'cm':
                        return value;
                    default:
                        throw new Error('Unknown measure ' + measureTo);
                }
                break;
            default:
                throw new Error('Unknown measure ' + measure);
        }
    };


    /**
     * Parse text and put result into exemplar "PdfTextInfo".
     * This function split text by paragraph then by word and calc size each word.
     * @param {String} text
     * @param {Object} options
     * @param {Object} options.isXml
     * @param {Object} options.font
     * @param {String} options.font.name
     * @param {String} options.font.type
     * @param {Number} options.font.wide
     * @param {Number} options.font.size
     * @param {String} options.font.color
     * @param {String} [options.font.align]
     * @param {Number} [options.textIndent]
     * @return {Object}
     * { paragraphs: [{
 *        blocks: [{
 *             text: '',
 *             font: {
 *               font: {},
 *               size: 12,
 *               color: ''
 *             }
 *        }, ....]
 *    }, ...]
 * }
     */
    jsPDFAPI.createTextInfo = function (text, options) {
        var me = this, defaultFont, defaultFontSize, defaultColor, block, paragraph, paragraphs, textInfo, // = { paragraphs: [], isTextInfo: true},
            root, parser;

        defaultFont = me.internal.getFont();
        defaultFontSize = me.internal.getFontSize();
        defaultColor = me.internal.textColorExt;

        options.font = options.font || {};
        options.font.name = options.font.name || defaultFont.fontName;
        options.font.type = options.font.type || defaultFont.fontStyle;
        options.font.size = options.font.size || defaultFontSize;
        options.font.color = options.font.color ? me.formatColor(options.font.color) : defaultColor;

        textInfo = me.newTextInfo();
        paragraph = textInfo.newParagraph();
        if (options.textIndent > 0){
            paragraph.textIndent = options.textIndent;
        }
        paragraph.isAutoCreated = true;
        block = paragraph.newBlock(me, '', options.font.name, options.font.type, options.font.size, options.font.color, options.align);

        function extractText(node) {
            var result = '';
            _.forEach(node.childNodes, function (childNode) {
                result += extractText(childNode);
                if (!childNode.nodeValue) {
                    result += childNode.nodeValue;
                }
            });
            return result;
        }


        function parseStyle(node) {
            var styleStr, result = {}, res = {}, tmp;
            if (!node || !node.attributes) {
                return { font: {}};
            }
            styleStr = node.attributes.getNamedItem('style');
            if (!styleStr || !styleStr.value) {
                return { font: {}};
            }
            _.forEach(styleStr.value.split(';'), function (elementStr) {
                if (!elementStr) {
                    return;
                }
                var pair = elementStr.split(':');
                if (pair.length < 2) {
                    return;
                }
                result[pair[0].trim()] = pair[1].trim();
            });

            res.font = {};
            if (result["font-family"]) {
                res.font.name = result["font-family"];
                res.font.name = me.getFontNameByHtmlName(res.font.name) || res.font.name;
            }
            if (result["font-weight"]) {
                tmp = result["font-weight"];
                if (tmp){
                    tmp = _.capitalize(tmp);
                    res.font.weight = tmp;
                    if (tmp !== 'Normal') {
                        res.font.type = 'Bold';
                    }
                }
            }
            if (result["font-style"]) {
                tmp = result["font-style"];
                if (tmp) {
                    tmp = _.capitalize(tmp);
                    res.font.style = tmp;
                    if (tmp.toLowerCase() !== 'Normal') {
                        res.font.type = (res.font.type || '') + 'Italic';
                    }
                }
            }
            if (result.color) {
                res.font.color = me.formatColor(result.color);
            }
            if (result["font-size"]) {
                tmp = result["font-size"];
                if (tmp) {
                    if (tmp.substr(-1) === '%') {
                        res.font.size = (parseInt(tmp, 10) / 100) * (options.font.size || 10);
                    } else if (tmp.substr(-2) === 'px') {
                        res.font.size = parseInt(tmp, 10);
                    } else if (tmp.substr(-2) === 'pt') {
                        res.font.size = parseInt(tmp, 10);
                    }
                    // todo add named sizes
                }
            }
            //    cfg.color || pBlock.font.color);
            if (result["text-align"]) {
                tmp = result["text-align"];
                if (tmp) {
                    res.align = tmp.toLowerCase();
                }
            }

            if (result["text-indent"]) {
                tmp = parseInt(result["text-indent"], 10);
                if (tmp && !Number.isNaN(tmp)) {
                    res.textIndent = tmp;
                }
            }

            return res;
        }


        function mixFontType(parentType, type, font){
            let fixType = font && (font.weight === 'Normal' || font.style === 'Normal');
            if (parentType && type && !fixType && (parentType !== type) && (
                (parentType === 'Italic' && type === 'Bold') ||
                (parentType === 'BoldItalic') ||
                (type === 'BoldItalic') ||
                (parentType === 'Bold' && type === 'Italic')
              ) ){
               return 'BoldItalic'
            }
            return type || parentType;
        }

        /**
         *
         * @param {Object} parent
         */
        function parseNodes(parent) {
            var pBlock;

            _.forEach(parent.childNodes, function (node) {
                pBlock = block;
                switch (node.nodeName.toUpperCase()) {
                    case 'STRONG':
                    case 'B':
                        block = paragraph.checkBlock(me, block, node.nodeValue,
                            pBlock.font.fontName || options.font.name,
                            mixFontType(pBlock.font.fontStyle, "Bold"),
                            pBlock.font.size || options.font.size,
                            pBlock.font.color || options.font.color,
                            pBlock.align
                        );
                        parseNodes(node);
                        block = paragraph.newBlock(me, '', pBlock.font.fontName, pBlock.font.fontStyle, pBlock.font.size, pBlock.font.color, pBlock.align);
                        break;
                    case 'EM':
                    case 'I':
                        block = paragraph.checkBlock(me, block, node.nodeValue,
                            pBlock.font.fontName || options.font.name,
                            mixFontType(pBlock.font.fontStyle, "Italic"),
                            pBlock.font.size || options.font.size,
                            pBlock.font.color || options.font.color,
                            pBlock.align
                        );
                        parseNodes(node);
                        block = paragraph.newBlock(me, '', pBlock.font.fontName, pBlock.font.fontStyle, pBlock.font.size, pBlock.font.color, pBlock.align);
                        break;
                    case 'BIG':
                        block = paragraph.checkBlock(me, block, node.nodeValue,
                            pBlock.font.fontName || options.font.name,
                            pBlock.font.fontStyle || options.font.type,
                            pBlock.font.size + 1,
                            pBlock.font.color || options.font.color,
                            pBlock.align
                        );
                        parseNodes(node);
                        block = paragraph.newBlock(me, '', pBlock.font.fontName, pBlock.font.fontStyle, pBlock.font.size, pBlock.font.color, pBlock.align);
                        break;
                    //<font name="" style=""  size="3" color="red">
                    case 'FONT':
                        var v, cfg = {};
                        v = node.attributes.getNamedItem('name');
                        if (v) {
                            cfg.name = me.getFontNameByHtmlName(v.value) || v.value;
                        }
                        v = node.attributes.getNamedItem('style');
                        if (v) {
                            cfg.type = v.value;
                        } else {
                            v = node.attributes.getNamedItem('type');
                            if (v) {
                                cfg.type = v.value;
                            }
                        }
                        v = node.attributes.getNamedItem('size');
                        if (v) {
                            cfg.size = v.value;
                        }
                        v = node.attributes.getNamedItem('color');
                        if (v) {
                            cfg.color = jsPDFAPI.formatColor(v.value);
                        }
                        block = paragraph.checkBlock(me, block, node.nodeValue, cfg.name || pBlock.font.fontName, mixFontType(pBlock.font.fontStyle, cfg.type) , cfg.size || pBlock.font.size, cfg.color || pBlock.font.color, pBlock.align);
                        parseNodes(node);
                        block = paragraph.newBlock(me, '', pBlock.font.fontName, pBlock.font.fontStyle, pBlock.font.size, pBlock.font.color, pBlock.align);
                        break;
                    case 'H1':
                        block = paragraph.checkBlock(me, block, '', pBlock.font.fontName, 'Bold', '22', pBlock.font.color, pBlock.align);
                        parseNodes(node);
                        block = paragraph.newBlock(me, '', pBlock.font.fontName, pBlock.font.fontStyle, pBlock.font.size, pBlock.font.color, pBlock.align);
                        break;
                    case 'H2':
                        block = paragraph.checkBlock(me,  block, '', pBlock.font.fontName, 'Bold', '17', pBlock.font.color, pBlock.align);
                        parseNodes(node);
                        block = paragraph.newBlock(me, '', pBlock.font.fontName, pBlock.font.fontStyle, pBlock.font.size, pBlock.font.color, pBlock.align);
                        break;
                    case 'H3':
                        block = paragraph.checkBlock(me, block, '', pBlock.font.fontName, 'Bold', '13', pBlock.font.color, pBlock.align);
                        parseNodes(node);
                        block = paragraph.newBlock(me, '', pBlock.font.fontName, pBlock.font.fontStyle, pBlock.font.size, pBlock.font.color, pBlock.align);
                        break;
                    case 'H4':
                        block = paragraph.checkBlock(me, block, '', pBlock.font.fontName, 'Bold', '11', pBlock.font.color, pBlock.align);
                        parseNodes(node);
                        block = paragraph.newBlock(me, '', pBlock.font.fontName, pBlock.font.fontStyle, pBlock.font.size, pBlock.font.color, pBlock.align);
                        break;
                    case 'H5':
                        block = paragraph.checkBlock(me, block, '', pBlock.font.fontName, 'Bold', '9', pBlock.font.color, pBlock.align);
                        parseNodes(node);
                        block = paragraph.newBlock(me, '', pBlock.font.fontName, pBlock.font.fontStyle, pBlock.font.size, pBlock.font.color, pBlock.align);
                        break;
                    case 'H6':
                        block = paragraph.checkBlock(me, block, '', pBlock.font.fontName, 'Bold', '7', pBlock.font.color, pBlock.align);
                        parseNodes(node);
                        block = paragraph.newBlock(me, '', pBlock.font.fontName, pBlock.font.fontStyle, pBlock.font.size, pBlock.font.color, pBlock.align);
                        break;

                    case 'BR':
                        paragraph.noIndent = true;
                        paragraph = textInfo.newParagraph();
                        block = paragraph.newBlock(me, '', pBlock.font.fontName, pBlock.font.fontStyle, pBlock.font.size, pBlock.font.color, pBlock.align);
                        break;
                    case 'SPAN':
                        cfg = parseStyle(node);
                        block = paragraph.checkBlock(me, block, '', cfg.font.name || pBlock.font.fontName, mixFontType(pBlock.font.fontStyle, cfg.font.type, cfg.font) , cfg.font.size || pBlock.font.size, cfg.font.color || pBlock.font.color, cfg.align || pBlock.align);
                        parseNodes(node);
                        block = paragraph.newBlock(me, '', pBlock.font.fontName, pBlock.font.fontStyle, pBlock.font.size, pBlock.font.color, pBlock.align);
                        break;
                    case 'P':
                        cfg = parseStyle(node);
                        if (block.text === '' && paragraph.isAutoCreated && paragraph.blocks.length === 1) {
                            paragraph.blocks = [];
                        } else {
                            paragraph = textInfo.newParagraph();
                        }
                        paragraph.textIndent = cfg.textIndent;
                        block = paragraph.newBlock(me, '', cfg.font.name || pBlock.font.fontName, mixFontType(pBlock.font.fontStyle, cfg.font.type, cfg.font), cfg.font.size || pBlock.font.size, cfg.font.color || pBlock.font.color, cfg.align || pBlock.align);
                        parseNodes(node);
                        paragraph = textInfo.newParagraph();
                        paragraph.isAutoCreated = true;
                        block = paragraph.newBlock(me, '', pBlock.font.fontName, pBlock.font.fontStyle, pBlock.font.size, pBlock.font.color);
                        break;
                    default:
                        if (node.nodeName.toLowerCase() === '#comment') {
                            return;
                        }
                        if (node.nodeValue) {
                            block.text += node.nodeValue; // extractText(node);
                        }
                        parseNodes(node);
                        break;
                }
            });
        }

        /**
         * Remove all not xml Entities
         * @param htmlText
         * @returns {*}
         */
        function removeEntities(htmlText) {
            var matches, re = /&([A-Za-z]{2,20})?;/g, rRe;
            matches = htmlText.match(re);
            if (!matches) {
                return  htmlText;
            }

            rRe = new RegExp('(' + _.difference(_.uniq(matches), ['&lt;', '&gt;', '&amp;', '&apos;', '&quot;']).join('|') + ')', 'g');
            return htmlText.replace(rRe, '');
        }

        var p, index;
        if (options.isXml) {
	          parser = new DOMParser(); // do not use window.DOMParser here because of server-side (fallback to xmldom)

            if (typeof(text) === 'string'){
                var htmlText = removeEntities(text);
                htmlText = htmlText.replace(/(\r|\n)/g, '');

                root = parser.parseFromString('<xmn>' + htmlText + '</xmn>', "application/xml").documentElement;
                if (root.childNodes.length > 0 && root.childNodes[0].nodeName === "parsererror") {
                    throw new Error(root.childNodes[0].innerHTML);
                }
            } else {
                root = text;
            }
            parseNodes(root);
            if (block.text === '' && paragraph.isAutoCreated && paragraph.blocks.length === 1 && textInfo.paragraphs.length > 1) {
                textInfo.paragraphs.pop();
            }

            if (!options.disableAutoIndent){
               textInfo.updateParagraphFormat(me);
            }
        } else {

            if (text.match(/\r\n|\r|\n/)) {
                paragraphs = text.split(/\r\n|\r|\n/g);
            } else {
                paragraphs = [text];
            }
            for (index = 0; index < paragraphs.length; index++ ){
                p = paragraphs[index];
                block.text += p;
                if (paragraphs.length > (index + 1)) {
                    paragraph = textInfo.newParagraph();
                    block = paragraph.newBlock(me, '', options.font.name, options.font.type, options.font.size, options.font.color);
                }
            }
        }

        var b, bIndex, w, wIndex, wordChars;
        // split words
        for (index = 0; index < textInfo.paragraphs.length; index++ ){
            p = textInfo.paragraphs[index];
            for (bIndex = 0; bIndex < p.blocks.length; bIndex++ ){
                b = p.blocks[bIndex];
                b.words = b.text.split(' ');
                if (index === 0) { // for start paragraph
                    // if string start from spaces we must add it to the first word
                    var startSpaceCnt = 0, startingSpaces = '';
                    while (b.words[startSpaceCnt] === '') {
                        startingSpaces += ' ';
                        startSpaceCnt++;
                    }
                    if ((startSpaceCnt > 1) && (b.words.length > startSpaceCnt)) {
                        b.words[0] = startingSpaces + b.words[startSpaceCnt];
                        b.words.splice(1, startSpaceCnt);
                    }
                }

                //var font = this.innerFonts[b.font.id];
                    /*,
                    fontOpt = {
                        widths: font.metadata.Unicode.widths,
                        kerning: font.metadata.Unicode.kerning
                    }*/

                for (wIndex = 0; wIndex < b.words.length; wIndex++ ){
                    w = b.words[wIndex];
                    if (!w) {
                        b.wordLen[wIndex] = 0;
                        continue;
                    }
                    //b.wordChars[wIndex] = wordChars = jsPDFAPI.getCharWidthsArray(w, font.metadata.Unicode /*b.options*/);
                    b.wordChars[wIndex] = wordChars = jsPDFAPI.getCharWidthsArrayEx.call(me, w, b.font.id);
                    b.wordLen[wIndex] = fontPointToUnit(getArraySum(wordChars), b.font.size, b.options.scaleFactor);
                }
            }
            // remove empty block
            bIndex = p.blocks.length - 1;
            while (bIndex >= 0){
                b = p.blocks[bIndex];
                if (!b.text && (p.blocks.length > 1)){
                    p.blocks.splice(bIndex, 1);
                }
                bIndex--;
            }

        }




        return textInfo;
    };


    function fixedCharCodeAt(str, idx) {
        var hi, low, code;
        code = str.charCodeAt(idx);
        if (0xD800 <= code && code <= 0xDBFF) {
            // Верхний вспомогательный символ
            hi = code;
            low = str.charCodeAt(idx + 1);
            return ((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000;
        }
        /*
         if (0xDC00 <= code && code <= 0xDFFF) {
         // Нижний вспомогательный символ
         var hi = str.charCodeAt(idx-1);
         var low = code;
         return ((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000;
         }
         */
        return code;
    }

    /**
     *
     * @param inbyte
     * @returns {string}
     * @constructor
     */
    function GetCharCodeEscaped(inbyte) {
        switch (inbyte) {
            case 13:
                return "\\r";
            case 10:
                return "\\n";
            case 9:
                return "\\t";
            case 8:
                return "\\b";
            case 12:
                return "\\f";
            case 40:
            case 41:
            case 92:
                return "\\" + String.fromCharCode(inbyte);
            default:
                return String.fromCharCode(inbyte);
        }
    }

    function To16BEText(ch) {
        /*jshint bitwise: false*/
        var result = '';
        var convert_to_bytes = function () {
            var byte1 = ch >> 8;
            var byte2 = ch & 0x00FF;
            result += GetCharCodeEscaped(byte1);
            result += GetCharCodeEscaped(byte2);
        };
        /*jshint bitwise: true*/

        if (0xD800 <= ch && ch <= 0xDFFF) {
            throw new Error('incorrect char ' + ch);
        }
        if (ch <= 0xFFFF) {
            convert_to_bytes();
            return result;
        }

        var lead = Math.floor((ch - 0x10000) / 0x400) + 0xD800;
        var trail = ((ch - 0x10000) % 0x400) + 0xDC00;
        convert_to_bytes(lead);
        convert_to_bytes(trail);
        return result;

    }

    jsPDFAPI.pdfEscapeExt = function (text, flags) {
        var ffont = this.internal.getFont(),
            lCMAP = ffont.extFont.cMap,  //UnicodeFonts[0].cMap
            l = text.length,
            nc;
        /*
         For text strings encoded in Unicode, the first two bytes must be 254 followed by 255.
         These two bytes represent the Unicode byte order marker, U+FEFF,
         indicating that the string is encoded in the UTF-16BE (big-endian) encoding scheme specified in the Unicode standard.
         */
        //var res = String.fromCharCode(255) + String.fromCharCode(254)

        var res = "";
        for (var i = 0, chr; i < l; i++) {
            chr = fixedCharCodeAt(text, i);
            nc = lCMAP[chr];
            //res += String.fromCharCode(nc) ;
            res += To16BEText(nc);
        }
        return res;
    };

    jsPDFAPI.setFontWidth = function (x) {
        this.fontWidth = (x || 0) + " Tr\n";
    };

    jsPDFAPI.setFontWidthBold = function () {
        this.setFontWidth("2");
    };

    jsPDFAPI.setFontWidthNormal = function () {
        this.setFontWidth("0");
    };

    /**
     * Return text width.
     * @param {String} text
     * @param {Object} font
     * @returns {Number}
     */
    jsPDFAPI.getTextWidth = function (text, font) {
        var me = this, ffont, wordChars;
        ffont = font ? me.internal.getFont(font.name, font.type) : me.internal.getFont();

        wordChars = jsPDFAPI.getCharWidthsArrayEx.call(me, text, ffont.id);
        return fontPointToUnit(getArraySum(wordChars), font.size,  me.internal.scaleFactor) / me.internal.scaleFactor;
    };


    /**
     * @deprecated
     * @param text
     * @param flags
     * @returns {{lines: number, width: number, height: number}}
     */
    jsPDFAPI.textCalcMetrics = function (text, flags) {
        return this.textCalcMetricsByInfo(this.createTextInfo(text, {isXml: flags.isXml, font: flags.font }), flags);
    };

    /**
     *
     * @param {Object} textInfo
     * @param {Object} flags
     * @returns {{lines: number, width: number, height: number}}
     */
    jsPDFAPI.textCalcMetricsByInfo = function (textInfo, flags) {
        var me = this, result, ffont, firstLineWidth, lineHeight = [];
        ffont = this.internal.getFont();

        if (!ffont.extFont) {
            return;
        }

        if ((textInfo === undefined) || (textInfo === null) || textInfo.isTextInfo !== true) {
            throw new Error('Invalid parameter textInfo');
        }

        this.prepareLines(textInfo, flags.wordWrap ? flags.width : 0);
        if (!flags.width && textInfo.paragraphs.length > 0 && textInfo.paragraphs[0].blocks.length > 0) {
            firstLineWidth = textInfo.paragraphs[0].blocks[0].lines[0].length;
        }

        var p, b, line, pNum, blockNum, lineNum, item, cHeidht, i, keyArr;

        for( pNum = 0; pNum < textInfo.paragraphs.length; pNum++ ){
            p = textInfo.paragraphs[pNum];
            for( blockNum = 0; blockNum < p.blocks.length; blockNum++ ){
                b = p.blocks[blockNum];
                cHeidht = me.getLineHeigh(b.font);
                //for( lineNum in b.lines ){
                keyArr = Object.keys(b.lines);
                for( i = 0; i < keyArr.length; i++){
                    lineNum = keyArr[i];
                    if (lineNum && b.lines.hasOwnProperty(lineNum)){
                        if (!lineHeight[lineNum] || (lineHeight[lineNum] < cHeidht)) {
                            lineHeight[lineNum] = cHeidht;
                        }
                    }
                }
            }
        }

        result = {lines: textInfo.lineCount, width: flags.width || firstLineWidth, height: 0};
        result.lineHeights = lineHeight;
        result.lineHeight = this.getLineHeigh();
        result.height = getArraySum(lineHeight);  //result.lines *  result.lineHeight;
        result.textInfo = textInfo;
        return result;
    };


    jsPDFAPI.lineHeightProportion = 1.0;

    jsPDFAPI.setLineLeading = function (newValue) {
        this.lineHeightProportion = newValue;
    };

    jsPDFAPI.getLineLeading = function () {
        return this.lineHeightProportion;
    };


    /**
     *
     * @param {Object} [font] optional
     * @param {String} [font.name] optional
     * @param {String} [font.type] optional
     * @param {Number} [font.size] optional
     * When undefined then use default font.
     * @returns {number}
     */
    jsPDFAPI.getLineHeigh = function (font) {
        var txtOut, result,
            k = this.internal.scaleFactor,
            ffont = font ? this.internal.getFont(font.name, font.type) : this.internal.getFont(),
            activeFontSize = font && font.size ? font.size : this.internal.getFontSize();

        //return ((ffont.extFont.fontMetric.ascent )  / 1000) * (activeFontSize * 1.0)/ k;
        return (( ffont.extFont.fontMetric.ascent + ( ffont.extFont.fontMetric.ascentDelta || 0 ) -
            ffont.extFont.fontMetric.descent  ) / 1000) * (activeFontSize * this.lineHeightProportion) / k;

        //(ffont.extFont.fontBBox.UpperRightY / 1000) * (activeFontSize * 1.0)/ k
        //return (750 / 1000) * (activeFontSize * 1.0)/ k;
    };

    jsPDFAPI.setFontDeflate = function(compressFont){
        return true;
    };

    /**
     * For optimization
     * @param pageNum
     */
    jsPDFAPI.shrinkPage = function(pageNum){
        if (this.internal.pages[pageNum].length > 5){
            this.internal.pages[pageNum] = [this.internal.pages[pageNum].join('\n')];
        }
    };

    /**
     * Output Unicode text to PDF
     * @param {Number} x Horizontal text position
     * @param {Number} y Vertical text position
     * @param {string} text
     * @param {Object} flags
     * @param {Number} flags.fontSize
     * @param {Object} [flags.textInfo]  It is text prepared  for write. If exists this parameter "text" parameter  will be ignored.
     * @param {Boolean} [flags.wordWrap=false]
     * @param {Number} [flags.width]  Width for word wrap.
     * @param {Boolean} [flags.isXml] Must be true if "text" parameter is xlm.
     * @returns {*}
     */
    jsPDFAPI.textExt = function (x, y, text, flags) {
        var me = this,
            API = me.internal,
            ffont = API.getFont(),
            activeFontSize = API.getFontSize(), activeFontKey = ffont.id, // "F13"
            k = API.scaleFactor,
            page = API.pageSize, result, usedUnicodeFonts, textInfo,
            textY,
            lineHeightProportion = me.getLineLeading(), pageNumber;


        if (!ffont.extFont) {
            return;
        }

        if (API.usedUnicodeFonts === undefined) {
            API.usedUnicodeFonts = [];
        }

        usedUnicodeFonts = API.usedUnicodeFonts;

        function useFont(fontID) {
            if (usedUnicodeFonts.indexOf(fontID) < 0) {
                usedUnicodeFonts.push(fontID);
            }
        }

        useFont(activeFontKey);

        if ((text === undefined) || (text === null)) {
            text = "";
        }

        if (!(text instanceof Array) && (typeof text !== 'string')) {
            text = text.toString();
        }

        flags = flags || {};
        pageNumber = flags.pageNumber || (API.pages.length === 0 ? 0 : API.pages.length - 1);
        if (flags.fontSize) {
            me.setFontSize(flags.fontSize);
        }

        var
            lineScope, textLength, lastDeltaX = 0, currentDeltaX = 0,
            firstLineWidth, rawString = '', rawStringArr = [], lastTLSize,
            lineCount = 0, lastBlocInfo = {}, textHeight = 0,
            isFirstLine = true, pageNM, metrics,
            maxWidth = flags.width ? Math.round(flags.width * k * 100) / 100 : flags.width; //MPV (flags.width * k).toFixed(2)

        pageNM = flags.pageNumber;
        if (!pageNM){
            pageNM = API.pages.length - 1;
        }
        if (API.pages.length < pageNM) {
            throw new Error('pageNumber out of range. Page = ' + pageNM + ' Pages=' + API.pages.length);
        }


        function putBlockInfo(block, ctx) {
            var fontSizeChanged = block.font.size !== lastBlocInfo.size;
            useFont(block.font.id);

            if (lastBlocInfo.id !== block.font.id || lastBlocInfo.size !== block.font.size) {
                rawStringArr.push(' /' , block.font.id , ' ' , block.font.size , ' Tf'); // font face, style, size;
                lastBlocInfo.id = block.font.id;
                lastBlocInfo.size = block.font.size;
            }
            if (lastBlocInfo.fontWidth !== ctx.fontWidth) {
                rawStringArr.push(' ' , ctx.fontWidth);
                lastBlocInfo.fontWidth = ctx.fontWidth;
            }
            //  ставим один в начале строки перед T*
            if (lastBlocInfo.lineHeightProportion !== lineHeightProportion || fontSizeChanged) {
                rawStringArr.push( ' ' , (block.font.size * lineHeightProportion) , ' TL');
                lastBlocInfo.lineHeightProportion = lineHeightProportion;
            }

            if (ctx.isNewTextColor(pageNumber, block.font.color)) { //lastBlocInfo.color
                rawStringArr.push( ' ' , block.font.color);
            }
            rawStringArr.push('\n');
            /*
             rawString += '/' + block.font.font.id + ' ' + block.font.size + ' Tf\n' + // font face, style, size;
             ctx.fontWidth +
             (block.font.size * lineHeightProportion) +  ' TL\n' + // line spacing
             block.font.color + '\n ';
             */
        }

        function outputLine(lineScope, ctx, textIndent, forceIsNotEndParagraph ) {
            var justifyArray = [], lineAlign = flags.align,
                i, item, cHeight, maxSize = 0, cSize, maxBlock, lTL;

            textLength = lineScope.textLength;
            /*
            //todo удаление лишних блоков ( вообше их не должно быть)
            i = lineScope.items.length - 1;
            while ( i >= 0) {
                item = lineScope.items[i];
                if (lineScope.items.length > 1 && ((item.line.words.length === 0) ||
                    (item.line.words.length === 1 && item.line.words[0] === ''))){
                    lineScope.items.splice(i, 1);
                }
                i--;
            }
            */

            maxSize = 0;
            maxBlock = null;
            for (i = 0; i < lineScope.items.length; i++) {
                item = lineScope.items[i];
                cHeight = 0;
                if (!maxBlock || (maxBlock.font.id !== item.block.font.id) || (maxBlock.font.size !== item.block.font.size)) {
                  cHeight = ctx.getLineHeigh(item.block.font);
                }
                lineAlign = item.block.align || lineAlign;

                if (cHeight > maxSize) {
                    maxSize = cHeight;
                    maxBlock = item.block;
                }
            }
            textHeight += maxSize;

            if (!isFirstLine){
                // Перед переводом строки T* должен быть TL с максмальной величиной шрифта в этой строке, если конечно в строке несколько фонтов
                if (maxSize > 0 && maxBlock) {
                    lastTLSize = maxBlock.font.size * lineHeightProportion;
                    //if (!this.pagesLastTL){
                    //    this.pagesLastTL = [];
                    //}
                    //this.pagesLastTL[pageNM] = lastTLSize;

                    rawStringArr.push( '\n' , lastTLSize, ' TL\n');
                }

                rawStringArr.push(lineCount !== 0 ? 'T* ' : '');
            } //else {
                // Для первой строки надо скорректировать отступ в случае если в предыдущем блоке указан большой или маленький отступ.
                // В рамках одной страницы.
                //rawStringArr.push('\n0 ',  12 - (maxSize * k), ' Td\n'); // 10 - фонт по умолчанию

                //if (this.pagesLastTL && this.pagesLastTL[pageNM]){
                //    lTL = maxBlock.font.size * lineHeightProportion;
                //    if (lTL !== this.pagesLastTL[pageNM]){
                //       rawStringArr.push('\n0 ', this.pagesLastTL[pageNM] - lTL,' Td\n');
                //    }
                //}
            //}
            isFirstLine = false;

            //rawStringArr.push( lineCount !== 0 ? 'T* ' : '');


            if (textIndent > 0){
                rawStringArr.push( '\n', textIndent, ' 0 Td\n');
            }

            if (lineAlign === 'justify' || lineAlign === 'left') {
                // если было смещение возвращаем
                if (currentDeltaX !== 0){
                    lastDeltaX = - currentDeltaX;
                    rawStringArr.push( lastDeltaX.toString() , " 0 Td\n");
                    currentDeltaX = 0;
                }
            }


            if (lineAlign === 'justify') {
                var n, isEndParagraph, allWordLen, lastItem, allWn, wn, notEmptyCnt = 0, realWidth, wSpace,
                  blockEndSpace, cntWord;

                lastItem = lineScope.items[lineScope.items.length - 1];
                isEndParagraph = (lastItem.paragraph.blocks.length - 1 === parseInt(lastItem.blockNum, 10)) && (lastItem.block.endLineNum === parseInt(lineScope.lineNum, 10));
                allWordLen = lineScope.allWordLen;
                if ( !forceIsNotEndParagraph && ((lastItem.line.words.length <= 1 && lineScope.items.length === 1) || isEndParagraph)) { // не надо ничего выравнивать
                    for( i = 0; i < lineScope.items.length; i++ ){
                        item = lineScope.items[i];
                        putBlockInfo(item.block, ctx);
                        rawStringArr.push( ' (', ctx.pdfEscapeExt(item.line.words.join(' '), flags), ')  Tj\n');
                    }
                } else {
                    realWidth = maxWidth - allWordLen - textIndent;
                    blockEndSpace = true; // last block end space
                    for( i = 0; i < lineScope.items.length; i++ ){
                        item = lineScope.items[i];
                        cntWord = 0;
                        for ( wn = 0; wn < item.line.words.length; wn++) {
                            if (item.line.words[wn] !== ''){
                                if (blockEndSpace || wn > 0) { // only for first word
                                    notEmptyCnt++;
                                }
                                cntWord++;
                            }
                            blockEndSpace = false;
                        }
                        blockEndSpace = item.line.words.length > 0 && cntWord > 0 && (item.line.words[item.line.words.length - 1] === '');
                    }

                    wSpace = realWidth / (notEmptyCnt - 1); //lineScope.wordCount
                    allWn = 0;
                    blockEndSpace = false;
                    for( i = 0; i < lineScope.items.length; i++ ){
                        item = lineScope.items[i];
                        justifyArray = [];
                        cntWord = 0;
                        if (blockEndSpace){ // previous block has space
                            justifyArray.push(wSpace * -1 * ( item.block.options.widths.fof || 1) /    //item.block.font.font.metadata.Unicode.widths.fof
                            item.block.font.size);
                        }
                        var lastNotEmptyWord = item.line.words.length - 1;
                        for ( wn = item.line.words.length - 1; wn >= 0 ; wn--) {
                            if (item.line.words[wn] === '') {
                                lastNotEmptyWord = wn - 1;
                            } else {
                                lastNotEmptyWord = wn;
                                break;
                            }
                        }
                        for ( wn = 0; wn < item.line.words.length; wn++) {
                            if (item.line.words[wn] !== '') {
                                cntWord++;
                                justifyArray.push('(', ctx.pdfEscapeExt(item.line.words[wn], flags), ')');
                                // set space if it is not end word in block
                                if ((wn < lastNotEmptyWord) && (item.line.words[wn] !== '')) {
                                    justifyArray.push(wSpace * -1 * ( item.block.options.widths.fof || 1) /    //item.block.font.font.metadata.Unicode.widths.fof
                                    item.block.font.size);
                                    allWn++;
                                }
                                blockEndSpace = false;
                            }
                        }
                        if (cntWord > 0) { // all word is empty
                            putBlockInfo(item.block, ctx);
                            rawStringArr.push(' [', justifyArray.join(''), ']  TJ\n');
                        }
                        // if exists more ten one block in line the line is HTML and parser separate end space as empty word
                        blockEndSpace = item.line.words.length > 0 && (cntWord > 0) &&
                        (item.line.words[item.line.words.length - 1] === '');
                    }
                }
            } else {
                switch (lineAlign) {
                    case 'right':
                        if (textLength + textIndent < maxWidth) {
                            lastDeltaX = Math.round((maxWidth - textLength - currentDeltaX - textIndent) * 100) / 100; //toFixed(2)
                            if (lastDeltaX !== 0) {
                                currentDeltaX = currentDeltaX + lastDeltaX;
                                rawStringArr.push( lastDeltaX.toString() , " 0 Td\n");
                            }
                        }
                        break;
                    case 'center':
                        if (textLength + textIndent < maxWidth) {
                            lastDeltaX = Math.round((((maxWidth - textLength) / 2) - currentDeltaX - textIndent) * 100) / 100; //toFixed(2)
                            if (lastDeltaX !== 0) {
                                currentDeltaX = currentDeltaX + lastDeltaX;
                                rawStringArr.push( lastDeltaX.toString() , " 0 Td\n");
                            }
                        }
                        break;
                }
                for( i = 0; i < lineScope.items.length; i++ ){
                    item = lineScope.items[i];
                    putBlockInfo(item.block, ctx);
                    rawStringArr.push( ' (' , ctx.pdfEscapeExt(item.line.words.join(' '), flags) , ')  Tj\n');
                }
            }

            for( i = 0; i < lineScope.items.length; i++ ){
                item = lineScope.items[i];
                item.paragraph = null;
                item.block = null;
                item.line = null;
            }
            lineScope.items = null;
            lineScope = null;
            lineCount++;

            if (textIndent > 0){
                rawStringArr.push( '\n', -textIndent, ' 0 Td\n');
            }

        }

        if (!flags.textInfo) {
            textInfo = this.createTextInfo(text, {isXml: flags.isXml });
            this.prepareLines(textInfo, flags.wordWrap ? flags.width : 0);
        } else {
            textInfo = flags.textInfo;
        }

        if (!flags.metrics){
            metrics = me.textCalcMetricsByInfo( textInfo,
                {  wordWrap: flags.wordWrap,
                    align: flags.align,
                    width: flags.width
                });
        } else {
            metrics = flags.metrics;
        }

        //textY = y + me.getLineHeigh() - ( Math.abs(ffont.extFont.fontMetric.descent || 0) / 2000) * activeFontSize, //((ffont.extFont.fontMetric.ascentDelta || 0) / 1000) * activeFontSize,
        textY = y + (metrics.lineHeights.length > 0 ?
             (!metrics.lineHeights[0] && metrics.lineHeights.length > 1 ? metrics.lineHeights[1]: metrics.lineHeights[0] ):
             (metrics.lineHeight || 0) ) * 0.8;
        // todo - extract max base line from line fonts for offset y

        function addLineScope(item) {
            if (!lineScope.items) {
                lineScope.items = [];
            }
            lineScope.items.push(item);
            var wordsLength = getArraySum(item.line.wordLen);
            lineScope.wordCount = (lineScope.wordCount || 0) + item.line.words.length;
            lineScope.allWordLen = (lineScope.allWordLen || 0) + wordsLength;
            lineScope.textLength = (lineScope.textLength || 0) + wordsLength + (item.line.wordLen.length - 1) * item.block.spaceCharWidth;
        }

        //rawString = 'BT\n' + (x * k).toFixed(2) + ' ' + ((page.height - textY) * k).toFixed(2) + ' Td\n';
        rawStringArr.push('BT\n' , (x * k).toFixed(2) , ' ' , ((page.height - textY) * k).toFixed(2) , ' Td\n');

        lineScope = { lineNum: -1 };

        var p, b, line, pNum, blockNum, lineNum, item, keyArr, i;
        for( pNum = 0; pNum < textInfo.paragraphs.length; pNum++ ){
            p = textInfo.paragraphs[pNum];
            for( blockNum = 0; blockNum < p.blocks.length; blockNum++ ){
                b = p.blocks[blockNum];
                //for( lineNum in b.lines ){
                keyArr = Object.keys(b.lines);
                for( i = 0; i < keyArr.length; i++){
                    lineNum = keyArr[i];
                    if (lineNum && b.lines.hasOwnProperty(lineNum)){
                        line = b.lines[lineNum];
                        item = {paragraph: p, block: b, blockNum: blockNum, line: line /*, lineNum: lineNum*/ };
                        if (lineScope.lineNum === lineNum) { // продолжение вывода текста
                            addLineScope(item);
                            continue;
                        }
                        if ((lineScope.lineNum >= 0) && lineScope.items) {
                            outputLine(lineScope, me, textInfo.textIndent[lineScope.lineNum] || 0 );
                        }
                        lineScope = { lineNum: lineNum };
                        addLineScope(item);
                    }
                }
            }
            if (lineScope.items) {
                outputLine(lineScope, me, textInfo.textIndent[lineScope.lineNum] || 0, flags.isNotEndParagraph);
            }
        }


        var arr;

        rawStringArr.push( '\n' , 'ET');
        rawString = rawStringArr.join('');
        rawStringArr.length = 0;

        // out
        API.pages[pageNM].push(rawString);

        if (API.pages[pageNM].length > 20 ){
            arr = API.pages[pageNM];
            API.pages[pageNM] = [arr.join('\n')];
            arr.length = 0;
            arr = null;
        }

        /*
         // Using "'" ("go next line and render text" mark) would save space but would complicate our rendering code, templates

         // BT .. ET does NOT have default settings for Tf. You must state that explicitely every time for BT .. ET
         // if you want text transformation matrix (+ multiline) to work reliably (which reads sizes of things from font declarations)
         // Thus, there is NO useful, *reliable* concept of "default" font for a page.
         // The fact that "default" (reuse font used before) font worked before in basic cases is an accident
         // - readers dealing smartly with brokenness of jsPDF's markup.
         out(
         'BT\n/' +
         activeFontKey + ' ' + activeFontSize + ' Tf\n' + // font face, style, size
         this.fontWidth +
         (activeFontSize * lineHeightProportion) +  ' TL\n' + // line spacing
         textColor + '\n ' +
         '\n' + (x * k).toFixed(2) + ' ' + ((page.height - textY) * k).toFixed(2) + ' Td\n' +
         str +
         'ET'
         );
         */

        if (!flags.width && textInfo.paragraphs.length > 0 && textInfo.paragraphs[0].blocks.length > 0) {
            firstLineWidth = textInfo.paragraphs[0].blocks[0].lines[0].length;
        }
        result = {lines: textInfo.lineCount, width: flags.width || firstLineWidth, height: 0};
        result.lineHeight = this.getLineHeigh();
        result.height = textHeight; // result.lines *  result.lineHeight;
        //result.textInfo = textInfo;
        return result;
    };

    /**
     * Set text color by PDF format.
     * @param {String} color
     */
    jsPDFAPI.setTextColorExtRaw = function (color) {
        this.internal.textColorExt = color || +'0 g';
    };


    /**
     * Set text color by RGB format
     * @param {Number} r
     * @param {Number} g
     * @param {Number} b
     * @returns {this}
     */
    jsPDFAPI.setTextColorExt = function (r, g, b) {
        this.setTextColorExtRaw(this.formatColorRGB(r, g, b));
        return this;
    };

    function checkNumber(value, contextName, isRequired) {
        if (!value && !isRequired) {
            return;
        }
        if (typeof(value) !== 'number' || isNaN(value)) {
            throw new Error(contextName + ': Value is not number.');
        }
    }

    /**
     * Format RGB to pdf color
     * @param {Number} r
     * @param {Number} g
     * @param {Number} b
     * @returns {string}
     */
    jsPDFAPI.formatColorRGB = function (r, g, b) {
        checkNumber(r, 'formatColorRGB.r', true);
        if (typeof g !== 'undefined') {
            checkNumber(g, 'formatColorRGB.g', true);
            checkNumber(b, 'formatColorRGB.b', true);
        }
        if ((r === 0 && g === 0 && b === 0) || (typeof g === 'undefined')) {
            return (r / 255).toFixed(3) + ' g';
        } else {
            return  [(r / 255).toFixed(2), (g / 255).toFixed(2), (b / 255).toFixed(2), 'rg'].join(' ');
        }
    };


    jsPDFAPI.colorNames = {'aliceblue': 'F0F8FF', 'antiquewhite': 'FAEBD7', 'aquamarine': '7FFFD4', 'azure': 'F0FFFF', 'beige': 'F5F5DC', 'bisque': 'FFE4C4', 'black': '000000', 'blanchedalmond': 'FFEBCD', 'blue': '0000FF', 'blueviolet': '8A2BE2', 'brown': 'A52A2A', 'burlywood': 'DEB887', 'cadetblue': '5F9EA0', 'chartreuse': '7FFF00', 'chocolate': 'D2691E', 'coral': 'FF7F50', 'cornflowerblue': '6495ED', 'cornsilk': 'FFF8DC', 'cyan': '00FFFF', 'darkgoldenrod': 'B8860B', 'darkgreen': '006400', 'darkkhaki': 'BDB76B', 'darkolivegreen': '556B2F', 'darkorange': 'FF8C00', 'darkorchid': '9932CC', 'darksalmon': 'E9967A', 'darkseagreen': '8FBC8F', 'darkslateblue': '483D8B', 'darkslategray': '2F4F4F', 'darkturquoise': '00CED1', 'darkviolet': '9400D3', 'deeppink': 'FF1493', 'deepskyblue': '00BFFF', 'dimgray': '696969', 'dodgerblue': '1E90FF', 'firebrick': 'B22222', 'floralwhite': 'FFFAF0', 'forestgreen': '228B22', 'gainsboro': 'DCDCDC', 'ghostwhite': 'F8F8FF', 'gold': 'FFD700', 'goldenrod': 'DAA520', 'gray': '808080', 'green': '008000', 'greenyellow': 'ADFF2F', 'honeydew': 'F0FFF0', 'hotpink': 'FF69B4', 'indianred': 'CD5C5C', 'ivory': 'FFFFF0', 'khaki': 'F0E68C', 'lavender': 'E6E6FA', 'lavenderblush': 'FFF0F5', 'lawngreen': '7CFC00', 'lemonchiffon': 'FFFACD', 'lightblue': 'ADD8E6', 'lightcoral': 'F08080', 'lightcyan': 'E0FFFF', 'lightgoldenrod': 'EEDD82', 'lightgoldenrodyellow': 'FAFAD2', 'lightgray': 'D3D3D3', 'lightpink': 'FFB6C1', 'lightsalmon': 'FFA07A', 'lightseagreen': '20B2AA', 'lightskyblue': '87CEFA', 'lightslate': '8470FF', 'lightslategray': '778899', 'lightsteelblue': 'B0C4DE', 'lightyellow': 'FFFFE0', 'limegreen': '32CD32', 'linen': 'FAF0E6', 'magenta': 'FF00FF', 'maroon': 'B03060', 'mediumaquamarine': '66CDAA', 'mediumblue': '0000CD', 'mediumorchid': 'BA55D3', 'mediumpurple': '9370DB', 'mediumseagreen': '3CB371', 'mediumslateblue': '7B68EE', 'mediumspringgreen': '00FA9A', 'mediumturquoise': '48D1CC', 'mediumviolet': 'C71585', 'midnightblue': '191970', 'mintcream': 'F5FFFA', 'mistyrose': 'FFE4E1', 'moccasin': 'FFE4B5', 'navajowhite': 'FFDEAD', 'navy': '000080', 'oldlace': 'FDF5E6', 'olivedrab': '6B8E23', 'orange': 'FFA500', 'orangered': 'FF4500', 'orchid': 'DA70D6', 'palegoldenrod': 'EEE8AA', 'palegreen': '98FB98', 'paleturquoise': 'AFEEEE', 'palevioletred': 'DB7093', 'papayawhip': 'FFEFD5', 'peachpuff': 'FFDAB9', 'peru': 'CD853F', 'pink': 'FFC0CB', 'plum': 'DDA0DD', 'powderblue': 'B0E0E6', 'purple': 'A020F0', 'red': 'FF0000', 'rosybrown': 'BC8F8F', 'royalblue': '4169E1', 'saddlebrown': '8B4513', 'salmon': 'FA8072', 'sandybrown': 'F4A460', 'seagreen': '2E8B57', 'seashell': 'FFF5EE', 'sienna': 'A0522D', 'skyblue': '87CEEB', 'slateblue': '6A5ACD', 'slategray': '708090', 'snow': 'FFFAFA', 'springgreen': '00FF7F', 'steelblue': '4682B4', 'tan': 'D2B48C', 'thistle': 'D8BFD8', 'tomato': 'FF6347', 'turquoise': '40E0D0', 'violet': 'EE82EE', 'violetred': 'D02090', 'wheat': 'F5DEB3', 'white': 'FFFFFF', 'whitesmoke': 'F5F5F5', 'yellow': 'FFFF00', 'yellowgreen': '9ACD32'};
    /**
     * Convert from html color to pdf RGB format
     * @param {String} color
     * @returns {Object|null} RGB format
     */
    jsPDFAPI.formatColor = function (color) {
        var me = this, result = color, bColor;

        if (!color){
            return null;
        }

        function parseHexColor(val) {
            var r = parseInt(val.substr(1, 2), 16), g = parseInt(val.substr(3, 2), 16), b = parseInt(val.substr(5, 2), 16);
            return jsPDFAPI.formatColorRGB(r, g, b);
        }

        if (color[0] === '#') {
            result = parseHexColor(color);
        } else {
            bColor = jsPDFAPI.colorNames[color];
            if (bColor) {
                result = parseHexColor('#' + bColor);
            }
        }
        return result;
    };

    function toHexStr(num){
        var res = parseInt(num, 10).toString(16);
        if (res.length < 2 ){
            return '0' + res;
        }
        return num;
    }

    function rgbColorToHex(color){
        var colorArr = (color || '').split(' ');

        switch(colorArr.length){
            case 2: return '#000000'; // todo parse gray color
            case 4: return '#' + toHexStr(colorArr[0]) + toHexStr(colorArr[1]) + toHexStr(colorArr[2]);
            default: throw new Error('Bad color');
        }
    }

    jsPDFAPI.lineOnPage = function (x1, y1, x2, y2, pageNumber) {
        var k = this.internal.scaleFactor, page = this.internal.pageSize;

        outPage(f2(x1 * k) + ' ' + f2((page.height - y1) * k) + ' m ' + f2(x2 * k) + ' ' + f2((page.height - y2) * k) + ' l S', pageNumber, this.internal);
        return this;
    };

    /**
     @param {Number} width Line width (in units declared at inception of PDF document)
     @function
     @returns {jsPDF}
     @name setLineWidth
     */
    jsPDFAPI.setLineWidthOnPage = function (width, pageNumber) {
        outPage((width * this.internal.scaleFactor).toFixed(2) + ' w', pageNumber, this.internal);
        return this;
    };

    /**
     Adds a rectangle to PDF

     @param {Number} x Coordinate (in units declared at inception of PDF document) against left edge of the page
     @param {Number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page
     @param {Number} w Width (in units declared at inception of PDF document)
     @param {Number} h Height (in units declared at inception of PDF document)
     @param {String} style (Defaults to active fill/stroke style) A string signalling if stroke, fill or both are to be applied.
     @function
     @returns {jsPDF}
     @methodOf jsPDF#
     @name rect
     */
    jsPDFAPI.rectOnPage = function (x, y, w, h, style, pageNumber) {
        var op = this.internal.getStyle(style),
          k = this.internal.scaleFactor, page = this.internal.pageSize;
        outPage([
            f2(x * k),
            f2((  page.height - y) * k),
            f2(w * k),
            f2(-h * k),
            're',
            op
        ].join(' '), pageNumber, this.internal);
        return this;
    };


    /**
     Sets the stroke color for upcoming elements.

     Depending on the number of arguments given, Gray, RGB, or CMYK
     color space is implied.

     When only ch1 is given, "Gray" color space is implied and it
     must be a value in the range from 0.00 (solid black) to to 1.00 (white)
     if values are communicated as String types, or in range from 0 (black)
     to 255 (white) if communicated as Number type.
     The RGB-like 0-255 range is provided for backward compatibility.

     When only ch1,ch2,ch3 are given, "RGB" color space is implied and each
     value must be in the range from 0.00 (minimum intensity) to to 1.00
     (max intensity) if values are communicated as String types, or
     from 0 (min intensity) to to 255 (max intensity) if values are communicated
     as Number types.
     The RGB-like 0-255 range is provided for backward compatibility.

     When ch1,ch2,ch3,ch4 are given, "CMYK" color space is implied and each
     value must be a in the range from 0.00 (0% concentration) to to
     1.00 (100% concentration)

     Because JavaScript treats fixed point numbers badly (rounds to
     floating point nearest to binary representation) it is highly advised to
     communicate the fractional numbers as String types, not JavaScript Number type.

     @param {Number} pageNumber
     @param {Number|String} ch1 Color channel value
     @param {Number|String} ch2 Color channel value
     @param {Number|String} ch3 Color channel value
     @param {Number|String} ch4 Color channel value

     @function
     @returns {jsPDF}
     @methodOf jsPDF#
     @name setDrawColorOnPage
     */
    jsPDFAPI.setDrawColorOnPage = function (pageNumber, ch1, ch2, ch3, ch4) {
        var color;
        checkNumber(pageNumber, 'setDrawColorOnPage.pageNumber', true);
        checkNumber(ch1, 'setDrawColorOnPage.ch1', true);
        checkNumber(ch1, 'setDrawColorOnPage.ch2', false);
        checkNumber(ch1, 'setDrawColorOnPage.ch3', false);
        checkNumber(ch1, 'setDrawColorOnPage.ch4', false);
        if (ch2 === undefined || (ch4 === undefined && ch1 === ch2 === ch3)) {
            // Gray color space.
            if (typeof ch1 === 'string') {
                color = ch1 + ' G';
            } else {
                color = f2(ch1 / 255) + ' G';
            }
        } else if (ch4 === undefined) {
            // RGB
            if (typeof ch1 === 'string') {
                color = [ch1, ch2, ch3, 'RG'].join(' ');
            } else {
                color = [f2(ch1 / 255), f2(ch2 / 255), f2(ch3 / 255), 'RG'].join(' ');
            }
        } else {
            // CMYK
            if (typeof ch1 === 'string') {
                color = [ch1, ch2, ch3, ch4, 'K'].join(' ');
            } else {
                color = [f2(ch1), f2(ch2), f2(ch3), f2(ch4), 'K'].join(' ');
            }
        }

        if (!this.isNewDrawColor(pageNumber, color)) {
            return this;
        }
        //this.lastDrawColor[pageNumber] = color;
        outPage(color, pageNumber, this.internal);
        return this;
    };

    /**
     *
     * @param {Number} pageNumber
     * @param {String} color
     * @returns {boolean}
     */
    jsPDFAPI.isNewDrawColor = function (pageNumber, color) {
        if (!this.lastDrawColor) {
            this.lastDrawColor = {};
        }
        return this.lastDrawColor[pageNumber] !== color;
    };

    /**
     *
     * @param {Number} pageNumber
     * @param {String} color
     * @returns {boolean}
     */
    jsPDFAPI.isNewTextColor = function (pageNumber, color) {
        if (!this.lastTextColor) {
            this.lastTextColor = {};
        }
        if (this.lastTextColor[pageNumber] !== color) {
            this.lastTextColor[pageNumber] = color;
            return true;
        }
        return false;
    };

    /**
     * @param {Number} pageNumber
     */
    jsPDFAPI.resetTextColor = function (pageNumber) {
        if (this.lastTextColor){
            this.lastTextColor[pageNumber] = null;
        }
    };


    /**
     *
     * @param {Number} pageNumber
     * @param {String} color
     * The color in raw format.
     * @returns {this}
     */
    jsPDFAPI.setDrawColorOnPageRaw = function (pageNumber, color) {
        checkNumber(pageNumber, 'setDrawColorOnPageRaw.pageNumber', true);
        //if (!this.isNewDrawColor(pageNumber, color)) {
        //    return this;
        //}
        outPage(color, pageNumber, this.internal);
        //this.lastDrawColor[pageNumber] = color;
        return this;
    };

    /**
     @param {Number} pageNumber
     @param {Number|String} ch1 Color channel value
     @param {Number|String} ch2 Color channel value
     @param {Number|String} ch3 Color channel value
     @param {Number|String} ch4 Color channel value

     @function
     @returns {jsPDF}
     @methodOf jsPDF#
     @name setFillColorOnPage
     */
    jsPDFAPI.setFillColorOnPage = function (pageNumber, ch1, ch2, ch3, ch4) {
        var color;
        checkNumber(pageNumber, 'setFillColorOnPage.pageNumber', true);
        checkNumber(ch1, 'setFillColorOnPage.ch1', true);
        checkNumber(ch1, 'setFillColorOnPage.ch2', false);
        checkNumber(ch1, 'setFillColorOnPage.ch3', false);
        checkNumber(ch1, 'setFillColorOnPage.ch4', false);
        if (ch2 === undefined || (ch4 === undefined && ch1 === ch2 === ch3)) {
            // Gray color space.
            if (typeof ch1 === 'string') {
                color = ch1 + ' g';
            } else {
                color = f2(ch1 / 255) + ' g';
            }
        } else if (ch4 === undefined) {
            // RGB
            if (typeof ch1 === 'string') {
                color = [ch1, ch2, ch3, 'rg'].join(' ');
            } else {
                color = [f2(ch1 / 255), f2(ch2 / 255), f2(ch3 / 255), 'rg'].join(' ');
            }
        } else {
            // CMYK
            if (typeof ch1 === 'string') {
                color = [ch1, ch2, ch3, ch4, 'k'].join(' ');
            } else {
                color = [f2(ch1), f2(ch2), f2(ch3), f2(ch4), 'k'].join(' ');
            }
        }

        if (!this.isNewFillColor(pageNumber, color)) {
            return this;
        }
        //this.lastFillColor[pageNumber] = color;
        outPage(color, pageNumber, this.internal);
        this.resetTextColor(pageNumber);
        return this;
    };



    /**
     *
     * @param {Number} pageNumber
     * @param {String} color
     * @returns {boolean}
     */
    jsPDFAPI.isNewFillColor = function (pageNumber, color) {
        if (!this.lastFillColor) {
            this.lastFillColor = {};
        }
        return this.lastFillColor[pageNumber] !== color;
    };

    /**
     *
     * @param {Number} pageNumber
     * @param {String} color
     * The color in raw format.
     * @returns {this}
     */
    jsPDFAPI.setFillColorOnPageRaw = function (pageNumber, color) {
        checkNumber(pageNumber, 'setFillColorOnPageRaw.pageNumber', true);
        //if (!this.isNewFillColor(pageNumber, color)) {
        //    return this;
        //}
        outPage(color, pageNumber, this.internal);
        //this.lastFillColor[pageNumber] = color;

        this.resetTextColor(pageNumber);
        return this;
    };

    jsPDFAPI.getCurrentPageInfo = function(){
        return this.internal.getCurrentPageInfo();
    };

})(jsPDF.API);