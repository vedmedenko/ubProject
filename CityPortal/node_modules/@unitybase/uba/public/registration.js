$(document).ready(function () {
    var frm = $('#registration-form');
    frm.validator();

  UB.connect({
    host: window.location.origin
    //path: window.location.pathname,
    /*
    onCredentialRequired: function(conn, isRepeat){
      return null;
    },
    onAuthorizationFail:  function(reason){
      UB.showErrorWindow(reason);
    },
    onGotApplicationConfig:  function(connection) {
      return UB.inject('models/mmp/locale/lang-' + connection.preferredLocale + '.js' + '?' + (new Date()).getTime() );
    }
    */
  }).then(function(conn){
        if (conn.domain.has('utm_campaign')) {
            (new UB.ClientRepository(conn, 'utm_campaign'))
            //UB.Repository('utm_campaign')
                .attrs(['code', 'name', 'sourceRequired', 'sourceLabel'])
                .selectAsObject().then(function (data) {
                    var cmpSelect = $('#utm_campaign');
                    $.each(data, function (i, item) {
                        var params = {
                            value: item.code,
                            text : item.name
                        };
                        if (item.sourceLabel){
                            params['data-sourcelabel'] = item.sourceLabel;
                        }
                        cmpSelect.append($('<option>', params));
                    });
                    cmpSelect.prop('disabled', false );
                    var scodes = data.map(function(r){ return r.code});
                    Object.keys(incomeParam).forEach(function(key){
                        if (scodes.indexOf(key) >= 0){
                            $('#utm_campaign').val(key).change();
                            $('#utm_source').val(incomeParam[key]);
                            $("#utm_source_group").removeClass('hidden');
                        }
                    })
                });
        }
  
  });

  

    $('#utm_campaign').on('change', function() {
        var sourceLabel = $(this).find(':selected').data('sourcelabel');
        if (sourceLabel){
            $('#utm_source').prop('placeholder', sourceLabel);
            $("#utm_source_group").removeClass('hidden');
        } else {
            $("#utm_source_group").addClass('hidden');
        }
    });

    var incomeParam = {};
    if (location.search) {
        location.search.substr(1).split("&").forEach(function (pstr) {
            var vp = pstr.split('=');
            incomeParam[vp[0]] = decodeURIComponent(vp[1]);
        });
        if (incomeParam.email) {
            $(this).find('#email').val(incomeParam.email);
        }
        if (incomeParam.phone) {
            $(this).find('#phone').val(incomeParam.phone);
        }
    }

    frm.on('submit', function (e) {
        if (!window.norecapcha && (grecaptcha.getResponse() === '')){
            e.preventDefault();
            var alertText = "Please, confirm you are not a robot";
            $('#registration-form').find('.messages').html('<div class="alert alert-danger" role="alert"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' +
                alertText + '</div>');
            return;
        }
        if (!e.isDefaultPrevented()) {
            frm.find('.messages').html('');
            $.ajax({
                type: 'POST',
                url: 'rest/uba_user/publicRegistration',
                contentType: "application/json; charset=utf-8",
                dataType   : "json",
                data: JSON.stringify({
                    email: $(this).find('#email').val(),
                    phone: $(this).find('#phone').val(),
                    utmCampaign: $(this).find('#utm_campaign').val(),
                    utmSource: $(this).find('#utm_source').val(),
                    recaptca: window.norecapcha ? '': grecaptcha.getResponse()
                })
            }).done(function(data){
                console.log(data);
                var alertBox = '<div class="alert alert-success" role="alert"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' +
                    data.message + '</div>';
                //frm[0].reset();
                //frm.find('.messages').html(alertBox);
                frm.html(alertBox);
            }).fail(function(reason){
                console.error(reason);
                var alertText;
                var inErr;
                var abortRe = /^UBAbort: /;
                if (reason && reason.responseJSON && abortRe.test(reason.responseJSON.errMsg)){
                    inErr = reason.responseJSON.errMsg;
                    inErr = /^UBAbort: <<<(.*)>>>$/.test(inErr) ? /^UBAbort: <<<(.*)>>>$/.exec(inErr)[1] : /^UBAbort: (.*)$/.exec(inErr)[1];
                    if (inErr === 'Duplicate user name (may be in different case)') {
                        alertText = 'Member with such EMail is already registered. If you forgot your password, please go to the "Member Area" and select "Need help?" option'
                    } else {
                        alertText = inErr;
                    }
                } else if (reason && reason.responseJSON && /<<<(.*)>>>/.test(reason.responseJSON.errMsg)){
                    inErr = reason.responseJSON.errMsg;
                    inErr = /<<<(.*)>>>/.exec(inErr)[1];
                    alertText = inErr? inErr: reason.responseJSON.errMsg;
                } else {
                    alertText = 'Error during processing your request. Please, try again later of <a href="contacts.html">contact us</a>'
                }
                var alertBox = '<div class="alert alert-danger" role="alert"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' +
                    alertText + '</div>';
                //frm[0].reset();
                frm.find('.messages').html(alertBox);
                if (!window.norecapcha) grecaptcha.reset();
            });
            return false;
        }
    })
});