window.BOUNDLED_BY_WEBPACK = false
if (BOUNDLED_BY_WEBPACK) {
  var UB = require('@unitybase/ub-pub')
}
$(document).ready(function () {
  ubAuth()
});

$('#btn-login-nav').click(function () {
  ubAuth()
})

$('#btn-login-j').click(function () {
  ubAuth()
})

$('#btn-get-req').click(function () {
  window.getMyRequests()
})

$('#btn-logout-nav').click(function () {
  if (window.$conn) window.$conn.logout().then(function () {
    getNonAuthContainers()
  })
})


//login with popUp dialog
function customConfirm () {
  return new Promise(function (resolve, reject) {
    $("#popUp")
      .html('<input type="text" class="form-control" placeholder="Username" id="login"  style = "margin: 10px">' +
        '<input type="password" class="form-control" placeholder="Password" id="pwd" style = "margin: 10px">'
      )
      .dialog({
        resizable: true,
        modal: true,
        buttons: {
          "Login": function () {
            $(this).dialog("close");
            resolve({
              authSchema: 'UB',
              login: document.getElementById('login').value,
              password: document.getElementById('pwd').value
            })
          },
          "Cancel": function () {
            $(this).dialog("close");
            reject();
          }
        },
        focus: function () {
          //submit login form with Enter-key in password field
          $('#pwd').keydown(function (eventObject) {
            if (event.keyCode == 13) {
              $('#popUp').dialog("close");
              resolve({
                authSchema: 'UB',
                login: document.getElementById('login').value,
                password: document.getElementById('pwd').value
              })
            }
          });
        },
      })
  })
}

//Create custom template MyDateField for Date formatting in jsGrid
var MyDateField = function (config) {
  jsGrid.Field.call(this, config);
};
MyDateField.prototype = new jsGrid.Field({
  itemTemplate: function (value) {
    return new Date(value).toDateString();
  }
})
jsGrid.fields.myDateField = MyDateField;

function objectDiff(original, modified) {
  let diff = {};
  let modifiedKeys = Object.keys(modified)

  for (let i = 0, l = modifiedKeys.length; i < l; i++) {
    let key = modifiedKeys[i];
    if (original[key] !== modified[key])
      diff[key] = modified[key];
  }
  return diff;
}

const REQ_ENTITY = 'req_reqList'
const REQ_ATTRS = ['ID', 'reqDate', 'status', 'applicantInfo', 'reqText', 'answer', 'mi_modifyDate']
function getMyRequests () {
  window.$conn.Repository(REQ_ENTITY).attrs(REQ_ATTRS).select()
    .then(function (data) {
      $("#jsGrid").jsGrid({
        width: "80%",
        paging: true,
        autoload: true,
        editing: true,
        controller: {
          loadData: function () {
            return data
          },
          updateItem: function(newData) {
            var d = $.Deferred();
            // To prevent unnecessary data modification we should pass only modified attributes
            let original = _.find(data, {ID: newData.ID})
            let diff = objectDiff(original, newData)
            // add a ID to diff
            diff.ID = newData.ID
            // Since we know our entity support optimistic locks - pass a source modification date
            diff.mi_modifyDate = original.mi_modifyDate
            // see UBConnection.update documentation at https://unitybase.info/api/ubcore/UBConnection.html#update
            //return 
            window.$conn.update({
              entity: REQ_ENTITY,
              fieldList: REQ_ATTRS,
              lockType: 'Temp', // pessimistic lock
              execParams: diff
            }).then((response) => {
              //return response
              let responseAsObject = UB.LocalDataStore.selectResultToArrayOfObjects(response)[0]
              // TODO - !@#@ js-grid not exit from edit mode
              // may be it wait for a jQuery promise ?
              //return $.Deferred().resolve(responseAsObject)
              d.resolve(responseAsObject)
            })
            return d.promise();
          }
        },
        fields: [
          { name: "reqDate", type: "myDateField", width: 100, editing: false, title: 'Request date' },
          { name: "status", type: "text", width: 50, editing: false, title: 'Status' },
          { name: "applicantInfo", type: "text", width: 50, editing: false, title: 'Applicant info' },
          { name: "reqText", type: "text", width: 150, editing: false, title: 'Text of request' },
          { name: "answer", type: "text", width: 150, title: 'Answer' },
          { type: "control" ,
            itemTemplate: function(value, item) {
              var $result = $([]);        
              return $result.add(this._createEditButton(item));
            }
          }
        ]
      });
    })
}

function getAuthContainers () {
  $("#btn-login-nav").css({ "display": "none" });
  $("#btn-logout-nav").css({ "display": "inline" });
  $("#welcome-container").css({ "display": "none" });
  $("#requests-container").css({ "display": "inline" });
}

function getNonAuthContainers () {
  $("#btn-login-nav").css({ "display": "inline" });
  $("#btn-logout-nav").css({ "display": "none" });
  $("#welcome-container").addClass("jumbotron").css({ "display": "block" });
  $("#requests-container").css({ "display": "none" });
}

function ubAuth () {
  UB.connect({
    host: window.location.origin,
    allowSessionPersistent: true,
    onCredentialRequired: function (conn, isRepeat) {
      return isRepeat
        ? Promise.reject(new UB.UBAbortError('invalid password for user admin'))
        : customConfirm();
    },
    onAuthorizationFail: function (reason) {
      $("#errDialog")
        .html('<b>' + reason + '</b>')
        .dialog({
          resizable: true,
          modal: true,
          buttons: {
            "Retry": function () {
              $(this).dialog("close");
              customConfirm();
            },
            "Cancel": function () {
              $(this).dialog("close");
            }
          }
        })
    }
  }).then(function (conn) {
    window.$conn = conn
    if ($('#popUp').hasClass('ui-dialog-content')) {
      $('#popUp').dialog("close");
    }
    getAuthContainers()
    window.getMyRequests()
  })

}
