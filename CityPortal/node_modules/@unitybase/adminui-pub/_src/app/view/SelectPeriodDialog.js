require('../ux/form/field/UBDate')
require('./BaseWindow')
  /**
 * Show dialog for user friendly select period.
 * Example:
 *
 *      UB.view.SelectPeriodDialog.getPeriod({
 *                       description: UB.i18n('selectPeriod'),
 *                       dateFrom:  me.periodContext.dateFrom,
 *                       dateTo:  me.periodContext.dateTo
 *                   }).then(function(result){
 *                           if (result){
 *                               me.periodContext = result;
 *                               periodLabel.setText(me.periodContext.periodCaption);
 *                           } // else user press cancel
 *                   });
 *
 */
Ext.define('UB.view.SelectPeriodDialog', {
    // todo rewrite to extend window
    // todo add quarter and year
    // todo add validation period month
    singleton: true,

    requires: [
        'Ext.form.RadioGroup',
        // 'UB.ux.form.field.UBDate',
        // 'UB.view.BaseWindow',
        'Ext.panel.Panel',
        'Ext.form.field.Checkbox',
        'Ext.form.field.ComboBox',
        'Ext.form.field.Number',
        'Ext.tab.Panel'
    ],

    /**
     * Return human readable period description (depend on user language). Examlpes:
     *
     *  - UB.view.SelectPeriodDialog.getPeriodCaption(new Date('2014-01-01'), new Date('2014-01-30')) // => `January 2014`
     *  - UB.view.SelectPeriodDialog.getPeriodCaption(new Date('2014-01-01'), new Date('2014-12-31')) // => `2014 y.`
     *  - UB.view.SelectPeriodDialog.getPeriodCaption(new Date('2014-01-01'), new Date('2014-03-31')) // => `January - March 2014 y.`
     *
     * @param {Date} dateFrom
     * @param {Date} dateTo
     * @return {String}
     */
    getPeriodCaption: function(dateFrom, dateTo){
        if (!dateFrom || !dateTo){
            return UB.i18n('emptyPeriod');
        }

        dateFrom = UB.core.UBUtil.truncTime( dateFrom);
        dateTo = UB.core.UBUtil.truncTime( dateTo);

        var me = this, period;
        period = me.parsePeriod(dateFrom, dateTo);

        if (period.oneDay){
            return Ext.Date.format( dateFrom, 'd.m.Y' );
        }
        if (period.oneMonth){
            return Ext.Date.monthNames[dateFrom.getMonth()] + ' ' + dateFrom.getFullYear();
        }
        //if (period.oneQuarter){
        //    return period.period.quarterStart + ' ' + UB.i18n('quarter') + ' ' + dateFrom.getFullYear() ;
        //}
        if (period.oneYear){
            return period.period.yearStart + UB.i18n('yearShort');
        }
        if (period.firtsDateYear && period.lastDateYear){
            return period.period.yearStart + ' - ' + period.period.yearEnd + UB.i18n('yearShort');
        }
        if (period.firstDateMonth && period.lastDateMonth && period.isOneYear ){
            return Ext.Date.monthNames[period.period.monthStart - 1] + ' - ' + Ext.Date.monthNames[period.period.monthEnd - 1]  + ' ' + period.period.yearStart + UB.i18n('yearShort') ;
        }
        if (period.firstDateMonth && period.lastDateMonth ){
            return Ext.Date.monthNames[period.period.monthStart - 1] + ' ' + period.period.yearStart + UB.i18n('yearShort') + ' - ' +
                   Ext.Date.monthNames[period.period.monthEnd - 1]  + ' ' + period.period.yearEnd + UB.i18n('yearShort');
        }
        return  Ext.Date.format( dateFrom, 'd.m.Y' ) + ' -' + Ext.Date.format( dateTo, 'd.m.Y' );
    },


    parsePeriod: function(dateFrom, dateTo){
        var result = {};
        result.period = {};
        result.oneDay = true;
        result.oneYear = true;
        result.oneMonth = true;
        result.oneQuarter = true;

        if (!dateFrom || !dateTo){
            result.period.type = 'none';
            return result;
        }
        dateFrom = UB.core.UBUtil.truncTime( dateFrom);
        dateTo = UB.core.UBUtil.truncTime( dateTo);

        result.firstDateMonth = Ext.Date.getFirstDateOfMonth( dateFrom).getTime() === dateFrom.getTime();
        result.lastDateMonth = Ext.Date.getLastDateOfMonth( dateTo ).getTime() === dateTo.getTime();

        result.firstDateQuarter = result.firstDateMonth && ( Math.floor(dateFrom.getMonth()/ 3) === dateFrom.getMonth()/ 3);
        result.lastDateQuarter = result.firstDateMonth && ( Math.floor((dateTo.getMonth() + 1)/ 3) === (dateTo.getMonth() + 1)/ 3);
        result.firtsDateYear = result.firstDateMonth && dateFrom.getMonth() === 0;
        result.lastDateYear = result.firstDateMonth && dateTo.getMonth() === 11;

        result.oneDay = dateFrom.getTime() ===  dateTo.getTime();
        result.isOneYear = dateFrom.getFullYear() === dateTo.getFullYear();
        result.oneMonth = result.oneYear && dateFrom.getMonth() === dateTo.getMonth();
        result.oneQuarter = result.oneYear && Math.floor(dateFrom.getMonth()/ 3) === Math.floor((dateTo.getMonth() + 1)/ 3);
        result.oneYear = result.isOneYear && result.firtsDateYear && result.lastDateYear;


        result.period.yearStart =  dateFrom.getFullYear();
        result.period.yearEnd = dateTo.getFullYear();

        if (result.firtsDateYear && result.lastDateYear){
            result.period.type = 'year';
        } else if (result.firstDateQuarter && result.lastDateQuarter){
            result.period.type = 'month';
            //result.period.type = 'quarter';
        }  else if (result.firstDateMonth && result.lastDateMonth){
            result.period.type = 'month';
        } else {
            result.period.type = 'date';
        }
        result.period.quarterStart =  Math.floor(dateFrom.getMonth()/ 3);
        result.period.quarterEnd =  Math.floor((dateTo.getMonth() + 1)/ 3);
        result.period.monthStart =  dateFrom.getMonth() + 1;
        result.period.monthEnd =  dateTo.getMonth() + 1;

        return result;
    },

    /**
     *
     * @param {Object} config
     * @param {String} [config.description]
     * @param {Date} [config.dateFrom] Initial value for start period date.
     * @param {Date} [config.dateTo]   Initial value for end period date.
     * @param {Boolean} [config.disableDayPanel]   True - disable choice days.
     *
     * @returns {Promise}
     */
    getPeriod: function(config){
        var me = this,
            dateFrom,
            dateTo,
            datePanel,
            monthData,
            monthYearFrom,
            monthYearTo,
            monthFrom,
            monthTo,
            monthPanel,
            workPanel,
            dialog,
            typeSelector,
            initFromDate, initToDate, periodConfig,
            selectFunc,
            yearPanel, yearFrom, yearTo,
            defer = Q.defer();

        monthData = [
            {code: 1, name: Ext.Date.monthNames[0]},
            {code: 2, name: Ext.Date.monthNames[1]},
            {code: 3, name: Ext.Date.monthNames[2]},
            {code: 4, name: Ext.Date.monthNames[3]},
            {code: 5, name: Ext.Date.monthNames[4]},
            {code: 6, name: Ext.Date.monthNames[5]},
            {code: 7, name: Ext.Date.monthNames[6]},
            {code: 8, name: Ext.Date.monthNames[7]},
            {code: 9, name: Ext.Date.monthNames[8]},
            {code: 10, name: Ext.Date.monthNames[9]},
            {code: 11, name: Ext.Date.monthNames[10]},
            {code: 12, name: Ext.Date.monthNames[11]}
        ];

        initFromDate = config.dateFrom || Ext.Date.getFirstDateOfMonth( new Date() );
        initToDate = config.dateTo || Ext.Date.getFirstDateOfMonth( new Date() );
        periodConfig = me.parsePeriod(config.dateFrom, config.dateTo);

        /**
         *
         * @param newType
         * @param [oldType]
         */
        function setActivePanel(newType, oldType){
            if (oldType){
               var currentPeriod = getPeriod(oldType);
               setPeriod(currentPeriod.dateFrom || new Date(), currentPeriod.dateTo || new Date());
            }
            if (config.disableDayPanel && newType === 'date' ){
                newType = 'month';
            }
            switch (newType){
                case 'none':
                    workPanel.setActiveTab(workPanel.down('#emptyPeriod'));
                    break;
                case 'date':
                    workPanel.setActiveTab(datePanel);
                    break;
                case 'month':
                    workPanel.setActiveTab(monthPanel);
                    break;
                case 'year':
                    workPanel.setActiveTab(yearPanel);
                    break;
            }
        }



        typeSelector = Ext.widget('radiogroup',{
            fieldLabel:  UB.i18n('periodType'),
            labelAlign: 'top',
            allowBlank: false,
            //width: 130,
            header: false,
            columns: 1,
            vertical: true,
            items: [
                {
                    boxLabel  : UB.i18n('periodNone'),
                    name      : 'period',
                    checked: periodConfig.period.type === 'none',
                    inputValue: 'none'
                }, {
                    boxLabel  : UB.i18n('periodYear'),
                    name      : 'period',
                    checked: periodConfig.period.type === 'year',
                    inputValue: 'year'
                }, {
                    boxLabel  : UB.i18n('periodMonth'),
                    name      : 'period',
                    checked: periodConfig.period.type === 'month',
                    inputValue: 'month'
                }, {
                    boxLabel  : UB.i18n('periodDate'),
                    name      : 'period',
                    checked: periodConfig.period.type === 'date',
                    hidden: config.disableDayPanel,
                    inputValue: 'date'
                } /*, {
                    boxLabel  : 'other',
                    name      : 'period',
                    checked: false,
                    inputValue: 'other'
                } */
            ],
            listeners: {
                change: function(radio, newValue, oldValue){
                    setActivePanel(newValue.period, oldValue.period);
                }
            }
        });

        dateFrom = Ext.widget('ubdatefield', {
            labelWidth: 20,
            width: 150,
            allowBlank: false,
            fieldType: 'Date',
            listeners: {
                change: function(sender, newValue, oldValue){
                    var val = dateTo.getValue();
                    if (val && Ext.isDate(newValue) && (newValue.getTime() > val.getTime())){
                        dateTo.setValue(newValue);
                    }
                }
            }
        });

        dateTo = Ext.widget('ubdatefield', {
            labelWidth: 10,
            width: 150,
            labelSeparator: '',
            fieldLabel: ' -',
            hidden: !!periodConfig.oneDay,
            //validator: this.dateValidator,
            allowBlank: false,
            fieldType: 'Date',
            listeners: {
                change: function(sender, newValue, oldValue){
                    var val = dateFrom.getValue();
                    if (val && Ext.isDate(newValue) && (newValue.getTime() < val.getTime())){
                        dateFrom.setValue(newValue);
                    }
                }
            }
        });

        datePanel = Ext.widget('panel', {
            layout: 'vbox',
            items: [{
                xtype: 'checkbox',
                itemId: 'twoDay',
                boxLabel  : UB.i18n('periodChkTwoDay'),
                value: !periodConfig.oneDay,
                listeners: {
                    change: function(sender, newValue){
                        dateTo.setVisible(newValue);
                    },
                    scope: me
                }
            }, {
                layout: 'hbox',
                items: [
                    dateFrom,
                    dateTo
                ]
            }, {
                flex: 1
            }]
        });

        function onChangeMonth(type){
            //var period = getPeriod();
             if (monthYearTo.getValue() < monthYearFrom.getValue()){
                 if (type === 'from'){
                     monthYearTo.setValue(monthYearFrom.getValue());
                 } else {
                     monthYearFrom.setValue(monthYearTo.getValue());
                 }
             }
            if (monthTo.getValue() < monthFrom.getValue() && monthYearTo.getValue() === monthYearFrom.getValue() ){
                if (type === 'from'){
                    monthTo.setValue(monthFrom.getValue());
                } else {
                    monthFrom.setValue(monthTo.getValue());
                }
            }
        }

        monthFrom = Ext.create('Ext.form.field.ComboBox',{
            allowBlank: false,
            valueField: 'code',
            forceSelection: true,
            editable: false,
            displayField: 'name',
            store: Ext.create('Ext.data.Store', {
                fields: ['code','name'],
                data : monthData
            }),
            listeners:{
                change: function(sender, newValue, oldValue){
                    onChangeMonth('from');
                }
            }
        });
        monthYearFrom = Ext.widget('numberfield',{
            width: 100,
            minWidth: 100,
            minValue: 1900,
            listeners:{
                change: function(sender, newValue, oldValue){
                    onChangeMonth('from');
                }
            }
        });
        monthTo = Ext.create('Ext.form.field.ComboBox',{
            allowBlank: false,
            forceSelection: true,
            editable: false,
            valueField: 'code',
            displayField: 'name',
            store: Ext.create('Ext.data.Store', {
                fields: ['code','name'],
                data : monthData
            }),
            listeners:{
                change: function(sender, newValue, oldValue){
                    onChangeMonth('to');
                }
            }
        });
        monthYearTo = Ext.widget('numberfield',{
            minValue: 1900,

            minWidth: 100,
            width: 100,
            listeners:{
                change: function(sender, newValue, oldValue){
                    onChangeMonth('to');
                }
            }
        });
        monthPanel = Ext.widget('container', {
            layout: 'vbox',
            items: [{
                   xtype: 'checkbox',
                   itemId: 'twoMonth',
                   boxLabel  : UB.i18n('periodChkTwoMonth'),
                   value: !periodConfig.oneMonth,
                   listeners: {
                       change: function(sender, newValue){
                           monthPanel.down('#monthTo').setVisible(newValue);
                       },
                       scope: me
                   }
                }, {
                    flex: 1,
                    layout: 'hbox',
                    items: [{
                        layout: 'vbox',
                        padding: 2,
                        flex: 1,
                        items: [monthYearFrom, monthFrom]
                    }, {
                        itemId: 'monthTo',
                        hidden: !!periodConfig.oneMonth,
                        padding: 2,
                        flex: 1,
                        layout: 'vbox',
                        items: [monthYearTo, monthTo]
                    }]
                }
            ]
        });

        //yearData, yearFrom, yearTo,
        yearFrom = Ext.widget('numberfield',{
            minValue: 1900,
            minWidth: 100,
            width: 100,
            listeners:{
                change: function(sender, newValue, oldValue){
                    if (newValue > yearTo.getValue()){
                        yearTo.setValue(newValue);
                    }
                }
            }
        });
        yearTo = Ext.widget('numberfield',{
            minValue: 1900,
            minWidth: 100,
            width: 100,
            listeners:{
                change: function(sender, newValue, oldValue){
                    if (newValue < yearFrom.getValue()){
                        yearFrom.setValue(newValue);
                    }
                }
            },
            hidden: periodConfig.isOneYear
        });

        yearPanel = Ext.widget('container', {
            layout: 'vbox',
            items: [{
                xtype: 'checkbox',
                itemId: 'twoYear',
                boxLabel  : UB.i18n('periodChkTwoYear'),
                value: !periodConfig.isOneYear,
                listeners: {
                    change: function(sender, newValue){
                        yearTo.setVisible(newValue);
                    },
                    scope: me
                }
            }, {
                flex: 1,
                layout: 'hbox',
                items: [yearFrom, yearTo]
            }
            ]
        });

        /**
         * Return selected period
         * @param {String} [oldType] Period section: 'year','month','day'
         * @returns {Object}
         */
        function getPeriod(oldType){
            var result = null, twoElement, dateFromD, dateToD;

            switch (oldType || typeSelector.getValue().period){
                case 'none':
                    result = {
                        dateFrom: null,
                        dateTo: null,
                        periodCaption: UB.i18n('emptyPeriod')
                    };
                    break;
                case 'date':
                    twoElement = datePanel.down('#twoDay').getValue();
                    result = {
                        dateFrom: dateFrom.getValue(),
                        dateTo: dateToD = (twoElement ?  dateTo.getValue() : dateFrom.getValue()),
                        periodCaption: UB.view.SelectPeriodDialog.getPeriodCaption(dateFrom.getValue(), dateToD)
                    };
                    break;
                case 'month':
                    twoElement = monthPanel.down('#twoMonth').getValue();
                    dateFromD = new Date(monthYearFrom.getValue(), monthFrom.getValue() - 1, 1);
                    dateToD = twoElement ?
                        Ext.Date.getLastDateOfMonth(new Date(monthYearTo.getValue(), monthTo.getValue() - 1,1)):
                        Ext.Date.getLastDateOfMonth(new Date(monthYearFrom.getValue(), monthFrom.getValue() - 1, 1));
                    result = {
                        dateFrom: dateFromD ,
                        dateTo: dateToD,
                        periodCaption: UB.view.SelectPeriodDialog.getPeriodCaption(dateFromD, dateToD)
                    };
                    break;
                case 'year':
                    twoElement = yearPanel.down('#twoYear').getValue();
                    result = {
                        dateFrom: dateFromD = new Date(yearFrom.getValue(), 0, 1),
                        dateTo: dateToD = Ext.Date.getLastDateOfMonth(new Date(
                            twoElement ? yearTo.getValue(): yearFrom.getValue(), 11, 1)),
                        periodCaption: UB.view.SelectPeriodDialog.getPeriodCaption(dateFromD, dateToD)
                    };
                    break;
            }
            return result;
        }

        function setPeriod(periodDateFrom, periodDateTo){
            periodDateFrom = UB.core.UBUtil.truncTime( periodDateFrom);
            periodDateTo = UB.core.UBUtil.truncTime( periodDateTo);
            var periodP = me.parsePeriod(periodDateFrom, periodDateTo);

            datePanel.down('#twoDay').setValue(!periodP.oneDay);
            dateFrom.setValue(periodDateFrom);
            dateTo.setValue(periodDateTo);

            //monthPanel.down('#monthTo').setVisible(!periodP.oneMonth);
            monthPanel.down('#twoMonth').setValue(!periodP.oneMonth);
            monthYearFrom.setValue( periodP.period.yearStart );
            monthYearTo.setValue( periodP.period.yearEnd );
            monthFrom.setValue( periodP.period.monthStart );
            monthTo.setValue( periodP.period.monthEnd );

            yearPanel.down('#twoYear').setValue(!periodP.isOneYear);
            yearFrom.setValue( periodP.period.yearStart);
            yearTo.setValue( periodP.period.yearEnd );
        }

        selectFunc = function(){
            var result = getPeriod();
            dialog.close();
            defer.resolve(result);
        };

        workPanel = Ext.widget('tabpanel', {
            itemId: 'workPanel',
            tabBar : {
                hidden: true
            },
            items: [{
                    padding: "20 0 0 5",
                    itemId: 'emptyPeriod',
                    html: UB.i18n('emptyPeriod')
                },
                yearPanel,
                monthPanel,
                datePanel
            ]
        });

        dialog = Ext.create('UB.view.BaseWindow', {
            title: config.description ? UB.i18n(config.description) : UB.i18n('selectPeriod'),
            height: 300,
            width: 650,
            closable: false,
            minimizable: false,
            maximizable: false,
            modal: true,
            autoShow: true,
            overflowY: 'auto',
            overflowX: 'auto',
            layout: {
                type: 'hbox',
                align: 'stretch'
             },
            items: [  {
                   xtype: 'container',
                   width: 130,
                   layout: 'fit',
                   items: [typeSelector]
                },{
                    xtype: 'container',
                    flex: 1,
                    layout: 'fit',
                    items: [workPanel]
                }
            ],
            buttons: [{
                text: UB.i18n('vybrat'),
                glyph: UB.core.UBUtil.glyphs.faCheck,
                handler: selectFunc,
                scope: me
            }, {
                text: UB.i18n('cancel'),
                glyph: UB.core.UBUtil.glyphs.faTimes,
                handler: function() {
                    dialog.close();
                    defer.resolve(null);
                }
            }]
        });

        setPeriod(initFromDate, initToDate);
        setActivePanel(periodConfig.period.type);

        dialog.show();
        return defer.promise;
    }
});
