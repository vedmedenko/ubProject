/**
* Class for apply data binding on form
* define in form code class construction like this:
    dataBind: {
        caption: {
            value: '"Входящий " + ([outNumber]?"№ " + [outNumber]:"Б/Н") + ([outDate]?Ext.Date.format([outDate], " от d.m.Y"):"")',
            visible: '([taskType] === "ONDATE")'
        },
        //controlLevel: { visible: '([taskType] !== "FORINFORMATION")'},
        shortText: {
            value: '[caption] || "без номера"'
        }
        //applications: {value: 'parseInt([copies] || 0, 10)+parseInt([sheets] || 0, 10)'},
        //copies: {value: 'parseInt([applications] || 0, 10)-parseInt([sheets] || 0, 10)'},
        //sheets: {value: 'parseInt([applications] || 0, 10)-parseInt([copies] || 0, 10)'}

        //toDocumentItemID: {restriction: '"[toDocumentItemID.docID] = " + [toDocumentID]' }
        //caption: { value: '"Входящий " + ([correspID])?[correspID.name]:"" + [outNumber]?"№ " + [outNumber]:"Б/Н" + [outDate]?Ext.Date.Format([outDate], " от d.m.Y"):""'},
    },

   and call UBS.dataBinder.applyBinding(this) in initUBComponent handler
*/



Ext.define('UBS.dataBinder', {
	singleton: true,
    /*
     * TODO: учесть выражения в "[]"
     * анализировать типы атрибута. Если лукап, сложный но не лукап и.т.д.	
     */
    applyBinding: function (frm) {
        var bindedAttr,
        bindingObj,
        bindedProp,
        preparedList,
        curParsedExpr, curParsedExprForCheck,
        formAttrName, formAttr,
        parseRegexp = /\{((\w+)\.?([\.\w]+)?)\}/gi,
            callStack = [],
            prepareOne = function (val, fullAttr, firstAttr, thAttr) {
                //console.debug(val, fullAttr, firstAttr, thAttr);
                formAttrName = "attr" + Ext.String.capitalize(firstAttr);
                formAttr = frm.getUBCmp(formAttrName);
                if (!formAttr) {
                    throw new Error("unexisted attribute [" + firstAttr + "] in dataBinding for " + bindedAttr + "." + bindedProp);
                }
                if (!preparedList[firstAttr]) {
                    preparedList[firstAttr] = {};
                }
                if (!preparedList[firstAttr][bindedAttr]) {
                    preparedList[firstAttr][bindedAttr] = {};
                }
                if (!preparedList[firstAttr][bindedAttr][bindedProp]) {
                    try {
                        //with(frm){ 
                        eval(curParsedExprForCheck);
                        //}
                    } catch (err) {
                        console.error('INVALID expression in binding: ' + bindedAttr + "." + bindedProp +
                            '\n parsed expression: ' + curParsedExpr +
                            '\n error: ' + err.message);

                    }
                    preparedList[firstAttr][bindedAttr][bindedProp] = {
                        method: 'set' + Ext.String.capitalize(bindedProp),
                        expr: curParsedExpr,
                        forEval: "this.getUBCmp(\"attr" + Ext.String.capitalize(bindedAttr) + "\").set" + Ext.String.capitalize(bindedProp) + "(" + curParsedExpr + ")"
                    };
                }
            },

            expressionParser = function (val, fullAttr, firstAttr, thAttr) {
                var res = "";
                if (!thAttr) { //simple expression
                    res = "this.getUBCmp(\"attr" + Ext.String.capitalize(firstAttr) + "\").getValue()";
                } else { //complex
                    res = "NOT SUPPORTED YET!";
                }
                return res;
            },

            expressionForCheckParser = function (val, fullAttr, firstAttr, thAttr) {
                var res = "";
                if (!thAttr) { //simple expression
                    res = "frm.getUBCmp(\"attr" + Ext.String.capitalize(firstAttr) + "\").getValue()";
                } else { //complex
                    res = "NOT SUPPORTED YET!";
                }
                return res;
            },

            onBindedAttrChange = function (sender, newVal, oldVal) {
                var
                dependentAttr,
                dependentProp,
                curAttrProps,
                nVal,
                stackPos,
                depList = this.dataBind._preparedList[sender.attributeName];
                //console.debug("sender %s new %s old %s", sender.attributeName, newVal, oldVal);
                //console.debug("before sender = %s st = %o", sender.attributeName, callStack);
                callStack.push(sender.attributeName);
                for (dependentAttr in depList) {
                    stackPos = Ext.Array.indexOf(callStack, dependentAttr);
                    if (stackPos === -1) { // not changed yet TODO - move down and check only for setValue Index e.t.c.
                        curAttrProps = depList[dependentAttr];
                        for (dependentProp in curAttrProps) {
                            nVal = eval(curAttrProps[dependentProp].expr);
                            this.getUBCmp("attr" + Ext.String.capitalize(dependentAttr))[curAttrProps[dependentProp].method](nVal);
                        }
                    }
                }
                stackPos = callStack.pop();
                if (stackPos !== sender.attributeName) {
                    console.error('pop %s but expect %s', stackPos, sender.attributeName);
                }
                //console.debug("after sender %s stack = %o", sender.attributeName, callStack);
            };

        frm.dataBind._preparedList = {};
        preparedList = frm.dataBind._preparedList;

        for (bindedAttr in frm.dataBind) {
            //console.debug("binding to attr %s", bindedAttr);
            if (bindedAttr[0] !== '_') {
                bindingObj = frm.dataBind[bindedAttr];

                for (bindedProp in bindingObj) {
                    //console.debug("bind to property %s", bindedProp);
                    curParsedExpr = bindingObj[bindedProp].replace(parseRegexp, expressionParser);
                    curParsedExprForCheck = bindingObj[bindedProp].replace(parseRegexp, expressionForCheckParser);
                    bindingObj[bindedProp].replace(parseRegexp, prepareOne);
                }
            }
        }
        // make onchange handlers
        for (bindedAttr in preparedList) {
            frm.getUBCmp("attr" + Ext.String.capitalize(bindedAttr)).addListener("change", onBindedAttrChange, frm);
        }
        //binderAttr = eval('this.getUBCmp("attrOutDate").getValue()');
        //console.debug("%o", frm.dataBind);
    }
});