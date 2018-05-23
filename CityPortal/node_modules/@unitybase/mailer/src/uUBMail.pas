unit uUBMail;

interface

uses 
  SyNodePluginIntf;

type
  TUBMailPlugin = class(TCustomSMPlugin)
  private
  protected
    procedure Init(const rec: TSMPluginRec); override;
  end;
implementation

uses
  mimemess, mimepart, synautil, synachar, smtpsend, pop3send, {$IFDEF openssl}ssl_openssl,{$ENDIF}
  SpiderMonkey, SyNodeProto, SyNodeSimpleProto,
  Classes, SysUtils, Windows,
  SynCommons, mORMOt, DateUtils, SyNodeReadWrite;

type
  TubSendMailBodyType = (smbtText, smbtHTML, smbtCalendar);
  TubSendMailAttachKind = (akFile, akText, akBuffer);

type
  TubMailSender = class(TSMTPSend)
  private
    fIsLogined: Boolean;
    fLastError: string;
  public
    constructor Create;
    destructor Destroy; override;
    procedure DoLogin;
    procedure DoLogout;
  end;

  TubMailReceiver = class(TPOP3Send)
  private
    fIsLogined: Boolean;
  public
    constructor Create;
    destructor Destroy; override;
    procedure DoLogin;
    procedure DoLogout;
  end;
{ TubMailReceiver }

constructor TubMailReceiver.Create;
begin
  fIsLogined := false;
  inherited Create;
end;

destructor TubMailReceiver.Destroy;
begin
  try
    doLogout;
  except
    // no exceptions in destructor
  end;
  inherited;
end;

procedure TubMailReceiver.DoLogin;
begin
  fIsLogined := login;
  if not fIsLogined then
    raise ESMException.CreateFmt('new TubMailReceiver() Cannot login to %s:%s as "%s": %s', [targetHost, targetPort, userName, Sock.LastErrorDesc]);
  if not Stat then
    raise ESMException.CreateFmt('new TubMailReceiver() Error receive server response on command STAT: %s', [Sock.LastErrorDesc]);
end;

procedure TubMailReceiver.DoLogout;
begin
  if fIsLogined then
    Logout;
  fIsLogined :=False;
end;

{ TubMailSender }

constructor TubMailSender.Create;
begin
  fIsLogined := false;
  inherited Create;
end;

destructor TubMailSender.Destroy;
begin
  try
    doLogout;
  except
    // no exceptions in destructor
  end;
  inherited;
end;

procedure TubMailSender.DoLogin;
begin
  fIsLogined := Login;
end;

procedure TubMailSender.DoLogout;
begin
  if fIsLogined then
    Logout;
  fIsLogined :=False;
end;

type
  TUBMimeMess = class(TMimeMess)
  private
    function getFullText: TStringList;
  published
    property MessagePart;
    property fullText: TStringList read getFullText;
    property Header;
  end;

{ TUBMimeMess }

function TUBMimeMess.getFullText: TStringList;
begin
  Result := Lines;
end;

const
  jsSL_class: JSClass = (name: 'StringCollection';
    flags: JSCLASS_HAS_PRIVATE;
//    addProperty: JS_PropertyStub;
//    delProperty: JS_DeletePropertyStub;
//    getProperty: JS_PropertyStub;
//    setProperty: JS_StrictPropertyStub;
//    enumerate: @JS_EnumerateStub;
//    resolve: JS_ResolveStub;// call then property not fount in thr current object
//    convert: JS_ConvertStub;
    );

function SLGetByteLength(cx: PJSContext; argc: uintN; var vp: JSArgRec): Boolean; cdecl;
var
  SL: TStringList;
  rval: jsval;
begin
  SL := vp.thisObject[cx].PrivateData;
  rval.asInteger := Length(SL.Text)-Length(sLineBreak);
  vp.rval := rval;
  Result := True;
end;

function SLGetLlinesCount(cx: PJSContext; argc: uintN; var vp: JSArgRec): Boolean; cdecl;
var
  SL: TStringList;
  rval: jsval;
begin
  SL := vp.thisObject[cx].PrivateData;
  rval.asInteger := SL.Count;
  vp.rval := rval;
  Result := True;
end;

function SLRead_impl(cx: PJSContext; argc: uintN; vals: PjsvalVector; thisObj, calleeObj: PJSObject): jsval; cdecl;
var
  SL: TStringList;
  str: string;
begin
  SL := thisObj.PrivateData;
  str := SL.Text;
  result := SMRead_impl(cx, argc, vals, Copy(str, 1, Length(str)-Length(sLineBreak)));
end;

function SLRead(cx: PJSContext; argc: uintN; var vp: JSArgRec): Boolean; cdecl;
begin
  Result := nsmCallFunc(cx, argc, vp, [
  0, Integer(@SLRead_impl),
  1, ptStr, Integer(@SLRead_impl)
  ])
end;

function SLReadLn_impl(cx: PJSContext; argc: uintN; vals: PjsvalVector; thisObj, calleeObj: PJSObject): jsval; cdecl;
var
  SL: TStringList;
  str: RawByteString;
begin
  SL := thisObj.PrivateData;
  str := SL[vals[0].asInteger];
  result := SMRead_impl(cx, argc-1, @vals[1], str);
end;

function SLReadLn(cx: PJSContext; argc: uintN; var vp: JSArgRec): Boolean; cdecl;
begin
  Result := nsmCallFunc(cx, argc, vp, [
  1, ptInt, Integer(@SLReadLn_impl),
  2, ptInt, ptStr, Integer(@SLReadLn_impl)
  ])
end;

function SLToJSVal(cx: PJSContext; PI: PPropInfo; aObj: TObject): jsval;
var obj: TObject;
    SL: TStringList;
    SLObj: PJSObject;
const
  props = JSPROP_ENUMERATE or JSPROP_READONLY or JSPROP_PERMANENT or JSPROP_SHARED;
  func = JSPROP_ENUMERATE or JSPROP_READONLY or JSPROP_PERMANENT;
begin
  obj := TObject(PI.GetOrdValue(aObj));

  if obj is TStringList then begin
    SL := TStringList(obj);
    SLObj := cx.NewObject(@jsSL_class);
    SLObj.PrivateData := SL;
    SLObj.DefineProperty(cx, 'byteLength', JSVAL_NULL, props, SLGetByteLength, nil);
    SLObj.DefineProperty(cx, 'linesCount', JSVAL_NULL, props, SLGetLlinesCount, nil);
    SLObj.DefineFunction(cx, 'read', SLRead, 1, func);
    SLObj.DefineFunction(cx, 'readLn', SLReadLn, 2, func);
    Result := SLObj.ToJSValue;
  end else
    raise ESMException.CreateFmt('SLToJSValAsText property %s is not TStringList', [PI.Name]);
end;

function DateToUTC(aDate: TDateTime): TDateTime;
var
  zone: Integer;
  x: Integer;
  t: TDateTime;
begin
  zone := TimeZoneBias;
  x := zone div 1440;
  Result := aDate - x;
  zone := zone mod 1440;
  t := EncodeTime(Abs(zone) div 60, Abs(zone) mod 60, 0, 0);
  if zone < 0 then
    t := 0 - t;
  Result := Result - t;
end;

function TMesPropToJSVal(cx: PJSContext; PI: PPropInfo; instance: PSMInstanceRecord): jsval;
var
  i: integer;
  e: Extended;
  str: RawByteString;
  unixTime: Int64;
  dmsec: double;
  oDate: PJSObject;
  d: TDateTime;
begin

  {$ifdef UNICODE}
  if (PI^.PropType^^.Kind = tkUString) then begin
    Result.asJSString := cx.NewJSString(PI.GetUnicodeStrValue(Instance^.instance));
  end else
  {$endif}
  if (PI^.PropType^^.Kind = tkLString) then begin
    // value is already in UTF-8
    PI.GetRawByteStringValue(Instance^.instance, str);
    Result.asJSString := cx.NewJSString(str);
  end else if (PI^.PropType^^.Kind = tkInteger) then begin
    Result.asInteger := PI.GetOrdValue(Instance^.instance);
  end else if (PI^.PropType^^.Kind = tkEnumeration) then begin
    i := PI.GetOrdValue(Instance^.instance);
    if PI^.PropType^ = TypeInfo(Boolean) then
      Result.asBoolean := Boolean(i)
    else begin
      str := PI^.PropType^^.EnumBaseType.GetEnumNameTrimed(i);
      Result.asJSString := cx.NewJSString(str);
    end;
  end else if (PI^.PropType^^.Kind = tkFloat) then begin
    e := PI.GetExtendedValue(Instance^.instance);
    if (PI^.PropType^ = TypeInfo(TDateTime)) then begin
      d := DateToUTC(e);
      str := DateTimeToStr(d);
      unixTime := DateTimeToUnixMSTime(d);
      dmsec := unixTime-(unixTime mod 1000);
      oDate := cx.NewDateObjectMsec(dmsec);
      if oDate.isDate(cx) then
        raise ESMException.CreateFmt('SetDateTime(%g): not a valid date',[d]);
      Result := oDate.ToJSValue;
    end else
      Result.asDouble := e;
  end else // This is TStringList
    Result := SLToJSVal(cx, PI, Instance^.instance);
end;

type
  TMessHeaderProtoObject = class(TSMSimpleRTTIProtoObject)
  protected
    function GetPropertyAddInformation(cx: PJSContext; PI:PPropInfo; out isReadonly: boolean;
      out isDeterministic: boolean; aParent: PJSRootedObject): boolean; override;
    function GetJSvalFromProp(cx: PJSContext; PI:PPropInfo; instance: PSMInstanceRecord): jsval; override;
  public
  end;

{ TMessHeaderProtoObject }

function TMessHeaderProtoObject.GetJSvalFromProp(cx: PJSContext;
  PI: PPropInfo; instance: PSMInstanceRecord): jsval;
begin
  Result := TMesPropToJSVal(cx, PI, instance)
end;

function TMessHeaderProtoObject.GetPropertyAddInformation(cx: PJSContext;
  PI: PPropInfo;  out isReadonly: boolean; out isDeterministic: boolean; aParent: PJSRootedObject): boolean;
begin
  Result := (PI^.PropType^^.Kind <> tkMethod) and ((PI^.PropType^^.Kind <> tkClass) or (PI^.PropType^^.ClassType.ClassType = TStringList));
  isReadonly := True;
  isDeterministic := True;
end;

type
  TMimePartProtoObject = class(TMessHeaderProtoObject)
  protected
    procedure InitObject(aParent: PJSRootedObject); override;
  public
  end;

{ TTMimePartProtoObject }
//function MimePartSubPartsEnumerate(cx: PJSContext; var obj: PJSObject; enum_op: JSIterateOp;
//  var state: jsval; idp: pjsid): JSBool; cdecl;
//var
//  Part: TMimePart;
//  val: jsval;
//  cnt: integer;
//  iterator: Integer;
//begin
//  Result := JS_TRUE;
//  Part := JS_GetPrivate(obj);
//  cnt := Part.GetSubPartCount;
//  case enum_op of
//    JSENUMERATE_INIT,
//    JSENUMERATE_INIT_ALL: begin // Create new iterator state over enumerable properties.
//      state := INT_TO_JSVAL(0);
//      if idp<>nil then
//        JS_ValueToId(cx, INT_TO_JSVAL(cnt), idp^);
//    end;
//    JSENUMERATE_NEXT: begin // Iterate once.
//      iterator := JSVAL_TO_INT(state);
//      begin
//        if iterator < cnt then
//          val := INT_TO_JSVAL(iterator)
//        else if iterator = cnt then
//          val := cx.NewJSString('length').ToJSVal{
//        else if iterator = cnt + 1 then
//          val := cx.NewJSString('saveToFile').ToJSVal;
//        else if iterator = cnt + 2 then
//          val := cx.NewJSString('asArrayBuffer').ToJSVal}
//        else begin
//          state := JSVAL_NULL;
//          Exit;
//        end;
//
//        state := INT_TO_JSVAL(iterator+1);
//        JS_ValueToId(cx,  val, idp^);
//      end;
//    end;
//    JSENUMERATE_DESTROY: begin // Destroy iterator state.
//      state := JSVAL_NULL;
//    end;
//  end;
//end;


function MimePartSubPartsReader(cx: PJSContext; var obj: PJSObject; var id: jsid;
  out vp: jsval): Boolean; cdecl;
var
  val: jsval;
  Part, SubPart: TMimePart;
  SubPartsVal: jsval;
  cnt, idx: integer;
  inst: PSMInstanceRecord;

  procedure DeleteLineBreaksFromSL(SL: TStringList);
  var
    str: RawByteString;
    i: integer;
    Size: integer;
    P: PAnsiChar;
    s: RawByteString;
    l: integer;
  begin
    Size := 0;
    for i := 0 to SL.Count-1 do Inc(Size, Length(SL[I]));
      SetLength(str, Size);
    P := pointer(str);
    for i := 0 to SL.Count-1 do begin
      S := StringToUTF8(SL[I]);
      L := Length(S);
      if L <> 0 then
      begin
        System.Move(Pointer(S)^, P^, L);
        Inc(P, L);
      end;
    end;
    SL.Text := str;
  end;

begin
  cx.IdToValue(id, val);
  Part := obj.privateData;
  cnt := Part.GetSubPartCount;

  if val.isString and (val.asJSString.ToUTF8(cx) = 'length') then
    vp.asInteger := cnt
  else if val.isInteger then begin
    idx := val.asInteger;
    if (idx<0) or (idx>=cnt) then
      vp := JSVAL_NULL
    else begin
      SubPartsVal := obj.ReservedSlot[idx];
//      SubPartsVals := SubPartsVal.asPrivate;
//      if not Assigned(SubPartsVals[idx+1]) then begin
      if SubPartsVal.isVoid then begin
        New(inst);
        SubPart := Part.GetSubPart(idx);
        SubPart.TargetCharset := UTF_8;
        SubPart.ForcedHTMLConvert := True;
        SubPart.DecodePartHeader;
        if UpperCase(SubPart.Disposition) <> 'ATTACHMENT' then begin
          SubPart.DecodePart;
          SubPart.PartBody.LoadFromStream(SubPart.DecodedLines);
        end else begin
          DeleteLineBreaksFromSL(SubPart.PartBody);
        end;
        SubPartsVal := inst.CreateForObj(cx, SubPart, TMimePartProtoObject, PJSRootedObject(nil));
        obj.ReservedSlot[idx] := SubPartsVal
      end;
      vp := SubPartsVal;
    end;
  end;

  result := True;
end;

//procedure MimePartSubPartsDestroy(cx: PJSContext; obj: PJSObject); cdecl;
{$IFDEF SM52}
procedure MimePartSubPartsDestroy(var fop: JSFreeOp; obj: PJSObject); cdecl;
{$ELSE}
procedure MimePartSubPartsDestroy(var rt: PJSRuntime; obj: PJSObject); cdecl;
{$ENDIF}
//var
//  SubPartsVals: PjsRVVector;
//  SubPartsVal: jsval;
//  cnt, i: Integer;
begin
//  c:= obj.Class_;
//  if c=@jsMimePartSubParts_class then
//    c := nil;
//  SubPartsVals := obj.ReservedSlot[0].asPrivate;
//  obj.ReservedSlot[0] := JSVAL_VOID;
//  cnt := SubPartsVals[0].ptr.asInteger;
//  cx := PJSContext(SubPartsVals[0].Stack);
//  for i := cnt downto 1 do
//  if Assigned(SubPartsVals[i]) then
//    cx.FreeRootedValue(SubPartsVals[i]);
//  Dispose(SubPartsVals[0]);
//  FreeMem(SubPartsVals, SizeOf(PJSRootedValue) * (cnt+1));
end;

const
{$IFDEF SM52}
  jsMimePartSubParts_classOps: JSClassOps = (
    getProperty: MimePartSubPartsReader;
    finalize: MimePartSubPartsDestroy; // call then JS object GC
  );
  jsMimePartSubParts_class: JSClass = (name: 'MimePartSubParts';
    flags: JSCLASS_HAS_PRIVATE or (255 shl JSCLASS_RESERVED_SLOTS_SHIFT);
    cOps: @jsMimePartSubParts_classOps
    );
{$ELSE}
  jsMimePartSubParts_class: JSClass = (name: 'MimePartSubParts';
    flags: JSCLASS_HAS_PRIVATE or (255 shl JSCLASS_RESERVED_SLOTS_SHIFT);
    getProperty: MimePartSubPartsReader;
    finalize: MimePartSubPartsDestroy; // call then JS object GC
    );
{$ENDIF}
    
function MimePartGetSubParts(cx: PJSContext; argc: uintN; var vp: JSArgRec): Boolean; cdecl;
var
  Inst: PSMInstanceRecord;
  SubPartsValIndex: Integer;
  SubPartsObj: PJSObject;
//  SubPartsVals: PjsRVVector;
  Part: TMimePart;
  cnt: Integer;
  SubPartsVal: jsval;
  this: PJSObject;
begin
  this := vp.thisObject[cx];
  if IsInstanceObject(cx, this, Inst) then begin
    SubPartsValIndex := Inst.proto.DeterministicCnt - 1;
    SubPartsVal := this.ReservedSlot[SubPartsValIndex];
    if SubPartsVal.isVoid then begin
      SubPartsObj := cx.NewObject(@jsMimePartSubParts_class);
      Part := TMimePart(Inst.instance);
      cnt := Part.GetSubPartCount;
      SubPartsObj.PrivateData := Part;
      SubPartsVal.asObject := SubPartsObj;
      this.ReservedSlot[SubPartsValIndex] := SubPartsVal;
    end;
    vp.rval := SubPartsVal;
//    JS_SET_RVAL(cx, vp, Inst.storedVals[SubPartsValIndex]);
  end else
    vp.rval := JSVAL_NULL;
  Result := True;
end;

procedure TMimePartProtoObject.InitObject(aParent: PJSRootedObject);
var
  l: Integer;
begin
  inherited;
  l := Length(FJSProps);
  SetLength(FJSProps, l+1);
  FJSProps[l].name := 'subPart';
  FJSProps[l].flags := JSPROP_ENUMERATE or JSPROP_PERMANENT or JSPROP_READONLY or JSPROP_SHARED;
  FJSProps[l].getter.native.info := nil;
  FJSProps[l].getter.native.op := MimePartGetSubParts;
  FJSProps[l].setter.native.info := nil;
  FJSProps[l].setter.native.op := nil;
  Inc(fDeterministicCnt);
end;

type

  TUBMimeMessProtoObject = class(TSMSimpleRTTIProtoObject)
  protected
    function GetPropertyAddInformation(cx: PJSContext; PI:PPropInfo; out isReadonly: boolean;
      out isDeterministic: boolean; aParent: PJSRootedObject): boolean; override;
    function GetJSvalFromProp(cx: PJSContext; PI:PPropInfo; instance: PSMInstanceRecord): jsval; override;
  public
    function NewSMInstance(aCx: PJSContext; argc: uintN; var vp: JSArgRec): TObject; override;
  end;

{ TUBMimeMessProtoObject }
function TUBMimeMessProtoObject.GetJSvalFromProp(cx: PJSContext;
  PI: PPropInfo; instance: PSMInstanceRecord): jsval;
var
t:Integer;
begin
  if PI.Name = 'Header' then
    t:=5
  else
    t :=2;
  if t>0 then
  if PI.Name = 'fullText' then
    Result := SLToJSVal(cx, PI, Instance^.instance)
  else
    Result := inherited GetJSvalFromProp(cx, PI, instance);
end;

function TUBMimeMessProtoObject.GetPropertyAddInformation(cx: PJSContext;
  PI: PPropInfo; out isReadonly: boolean; out isDeterministic: boolean; aParent: PJSRootedObject): boolean;
begin
  Result := true;
  isReadonly := True;
  isDeterministic := True;
end;

type
  TubMailSenderProtoObject = class(TSMCustomProtoObject)
  protected
    procedure InitObject(aParent: PJSRootedObject); override;
  public
    function NewSMInstance(aCx: PJSContext; argc: uintN; var vp: JSArgRec): TObject; override;
  end;

  TubMailReceiverProtoObject = class(TSMCustomProtoObject)
  protected
    procedure InitObject(aParent: PJSRootedObject); override;
  public
    function NewSMInstance(aCx: PJSContext; argc: uintN; var vp: JSArgRec): TObject; override;
  end;

function TUBMimeMessProtoObject.NewSMInstance(aCx: PJSContext; argc: uintN; var vp: JSArgRec): TObject;
begin
  Result := TUBMimeMess.Create;
end;

{ TubMailSenderProtoObject }
function ubMailSender_sendMail_impl(cx: PJSContext; argc: uintN; vals: PjsvalVector; thisObj, calleeObj: PJSObject): jsval; cdecl;
var
  nativeObj: PSMInstanceRecord;
  Sender: TubMailSender;
  Msg: TMimeMess;
  MIMEPart: TMimePart;
  BodyPart: TMimePart;

  obj: PJSObject;
  val: jsval;
  propArr: PJSObject;
  propObj: PJSObject;
  propItem: jsval;
  len: uint32;
  i: uint32;

  bodyType: TubSendMailBodyType;
  attKind: TubSendMailAttachKind;
  attDataStr: RawUTF8;
  attDataBufObj: PJSObject;
  attDataBuf: Pointer;
  attDataBufSize: uint32;  
  atachName: RawUTF8;
  attDataIncorrect: Boolean;
  isBase64: Boolean;
  attStream: TSynMemoryStream;

  sl: TStringList;
  res: Boolean;
  s, ps: string;

//  SU: SynUnicode;
  curState: string;
begin
  if not IsInstanceObject(cx, thisObj, nativeObj) then
    raise ESMException.Create('Object not Native');
  Sender := TubMailSender(nativeObj.instance);
  Msg := TMimeMess.Create;
  try
    Msg.Header.CharsetCode := UTF_8;
    Msg.MessagePart.TargetCharset := UTF_8;
    obj := vals[0].asObject;

    if obj.GetProperty(cx, 'subject', val) and val.isString then
      Msg.Header.subject := val.asJSString.ToUTF8(Cx)
//      Msg.Header.subject := val.asJSString.ToString(Cx)
    else
      Msg.Header.subject := '';
//    SU := UTF8ToSynUnicode(Msg.Header.subject);

    if obj.GetProperty(cx, 'bodyType', val) and val.isInteger then
      bodyType := TubSendMailBodyType(val.asInteger)
    else
      bodyType := smbtText;

    sl := TStringList.Create;
    try
      if obj.GetProperty(cx, 'body', val) and val.isString then
        sl.Text := val.asJSString.ToUTF8(Cx)
      else
        sl.Clear;
        MIMEPart := Msg.AddPartMultipart('mixed', nil);
        if bodyType in [smbtHTML, smbtCalendar] then
          BodyPart := Msg.AddPartHTML(sl,MIMEPart)
        else
          BodyPart := Msg.AddPartTextEx(sl,MIMEPart, UTF_8, true, ME_BASE64);
        MIMEPart.EncodingCode := ME_BASE64;
    finally
      FreeAndNil(sl);
    end;

    if obj.GetProperty(cx, 'fromAddr', val) and val.isString then
      Msg.Header.From := val.asJSString.ToUTF8(Cx)
    else
      Msg.Header.From := '';

    Msg.Header.ToList.Clear;
    if obj.GetProperty(cx, 'toAddr', val) and val.isObject then begin
      propArr := val.asObject;
      if propArr.isArray(cx) and propArr.GetArrayLength(cx, len) and (len>0) then
      for i := 0 to len - 1 do begin
        if propArr.GetElement(cx, i, propItem) and propItem.isString then
          Msg.Header.ToList.Add(propItem.asJSString.ToUTF8(Cx));
      end;
    end;

    if obj.GetProperty(cx, 'attaches', val) and val.isObject then begin
      propArr := val.asObject;
      if propArr.isArray(cx) and propArr.GetArrayLength(cx, len) and (len>0) then
      for i := 0 to len - 1 do
        if propArr.GetElement(cx, i, propItem) and propItem.isObject then begin
          propObj := propItem.asObject;
          if propObj.GetProperty(Cx, 'kind', val) and val.isInteger then
            attKind := TubSendMailAttachKind(val.asInteger)
          else
            attKind := TubSendMailAttachKind(-1);
          if (attKind < low(TubSendMailAttachKind)) or (attKind > High(TubSendMailAttachKind)) then
            raise ESMException.CreateFmt('Attach file error. Attach %d, invalid kind',[i]);

          attDataIncorrect := False;
          attDataBufSize := 0;
          attDataBuf := nil;
          if propObj.GetProperty(cx, 'data', val) then
            case attKind of
            akFile, akText:
              if val.isString then
                attDataStr := val.asJSString.ToUTF8(cx)
              else
              attDataIncorrect := True;
            akBuffer:
              if val.isObject then begin
                attDataBufObj := val.asObject;
                if attDataBufObj.IsArrayBufferObject() then begin
                  attDataBuf := attDataBufObj.GetArrayBufferData;
                  attDataBufSize := attDataBufObj.GetArrayBufferByteLength();
                end else
                attDataIncorrect := True;
              end else
              attDataIncorrect := True;
            end
          else
            attDataIncorrect := True;

          if attDataIncorrect then
            raise ESMException.CreateFmt('Attach file error. Attach %d, invalid data',[i]);

          if propObj.GetProperty(cx, 'atachName', val) and val.isString then
            atachName := val.AsJSString.ToUTF8(cx)
          else if attKind = akFile then
            atachName := ExtractFileName(attDataStr)
          else
            raise ESMException.CreateFmt('Attach file error. Attach %d, invalid atachName',[i]);

          if propObj.GetProperty(cx, 'isBase64', val) and val.isBoolean then
            isBase64 := val.asBoolean
          else
            isBase64 := false;

          attStream := nil;
          case attKind of
            akFile: attStream := TSynMemoryStreamMapped.Create(attDataStr);
            akText: attStream := TSynMemoryStream.Create(attDataStr);
            akBuffer: attStream := TSynMemoryStream.Create(attDataBuf, Integer(attDataBufSize));
          end;
          try
            if not isBase64 then
              Msg.AddPartBinary(attStream, atachName, MIMEPart)
            else with Msg.AddPart(MIMEPart) do begin
              DecodedLines.LoadFromStream(attStream);
              MimeTypeFromExt(atachName);
              Description := 'Attached file: ' + atachName;
              Disposition := 'attachment';
              FileName := atachName;
              EncodingCode := ME_BASE64;
              PartBody.Clear;
              attStream.Position := 0;
              PartBody.LoadFromStream(attStream);
              EncodePartHeader;
            end;
          finally
            attStream.Free;
          end;
        end;
    end;

    MIMEPart.EncodePartHeader;
    if bodyType = smbtCalendar then begin
      for i := 0 to BodyPart.Headers.Count-1 do
        if Pos('CONTENT-TYPE:', UpperCase(BodyPart.Headers[i])) = 1 then
          BodyPart.Headers[i] := 'Content-type: text/calendar; method=REQUEST; charset=UTF-8';
    end;
    MIMEPart.EncodePart;

    Msg.EncodeMessage;

    curState := 'MailFrom';
    res := Sender.MailFrom(GetEmailAddr(Msg.Header.From), Length(Msg.Lines.Text));
    if res then begin
      curState := 'MailTo';
      for I := 0 to Msg.Header.ToList.Count - 1 do
      begin
        s := Msg.Header.ToList[I];
        { для каждого получателя выполняем команду MAIL TO }
        ps := GetEmailAddr(s);
        res := Sender.MailTo(ps);
        // не смогли выполнить команду - прерываем выполнение
        if not res then
          Break;
      end;
      if res then begin//все в порядке - выполняем команду DATA
        curState := 'MailData';
        res := Sender.MailData(Msg.Lines);
      end;
    end;
  finally
    freeAndNil(Msg);
  end;


  if res then begin
    Sender.fLastError := '';
    Result.asBoolean := true
  end else begin
    if Sender.ResultString<>'' then
      Sender.fLastError := Format('%s (%s)',[Sender.ResultString, curState])
    else
      Sender.fLastError := Format('%d %s (%s)',[Sender.Sock.LastError, Sender.Sock.LastErrorDesc, curState]);
    Sender.Reset;
//    raise Exception.Create(curState);
    Result.asBoolean := False;
  end
end;

function ubMailSender_sendMail(cx: PJSContext; argc: uintN; var vp: JSArgRec): Boolean; cdecl;
begin
  Result := nsmCallFunc(cx, argc, vp, [1, ptObj, integer(@ubMailSender_sendMail_impl)]);
end;

function SenderLastError(cx: PJSContext; argc: uintN; var vp: JSArgRec): Boolean; cdecl;
var
  Inst: PSMInstanceRecord;
begin
  if IsInstanceObject(cx, vp.thisObject[cx], Inst) then begin
    vp.rval := cx.NewJSString(TubMailSender(Inst.instance).fLastError).ToJSVal;
  end else
    vp.rval := JSVAL_NULL;
  Result := True;
end;

procedure TubMailSenderProtoObject.InitObject(aParent: PJSRootedObject);
var
  l: Integer;
begin
  definePrototypeMethod('sendMail', @ubMailSender_sendMail, 1, [jspEnumerate, jspPermanent, jspReadOnly]);

  l := Length(FJSProps);
  SetLength(FJSProps, l+1);
  FJSProps[l].name := 'lastError';
  FJSProps[l].flags := JSPROP_ENUMERATE or JSPROP_PERMANENT or JSPROP_READONLY or JSPROP_SHARED;
  FJSProps[l].getter.native.info := nil;
  FJSProps[l].getter.native.op := SenderLastError;
  FJSProps[l].setter.native.info := nil;
  FJSProps[l].setter.native.op := nil;

  inherited InitObject(aParent);
end;

function TubMailSenderProtoObject.NewSMInstance(aCx: PJSContext; argc: uintN; var vp: JSArgRec): TObject;
var
  obj: PJSObject;
  val: jsval;
  Sender: TubMailSender;
  authNeccessary: Boolean;
begin
  if (argc=1) and vp.argv[0].isObject then begin
    obj := vp.argv[0].asObject;
    Sender := TubMailSender.Create;
    try
      if obj.GetProperty(aCx, 'host', val) and val.isString then
        Sender.targetHost := val.asJSString.ToUTF8(aCx)
      else
        raise ESMException.Create('new TubMailSender() host is not specified');
      if obj.GetProperty(aCx, 'port', val) and val.isString then
        Sender.targetPort := val.asJSString.ToUTF8(aCx)
      else
        raise ESMException.Create('new TubMailSender() port is not specified');
      if obj.GetProperty(aCx, 'user', val) and val.isString then
        Sender.userName := val.asJSString.ToUTF8(aCx)
      else
        Sender.userName := '';
      if obj.GetProperty(aCx, 'password', val) and val.isString then
        Sender.password := val.asJSString.ToUTF8(aCx)
      else
        Sender.password := '';
      if obj.GetProperty(aCx, 'tls', val) and val.isBoolean then
        Sender.autoTLS := val.asBoolean
      else
        Sender.autoTLS := False;
      if obj.GetProperty(aCx, 'auth', val) and val.isBoolean then
        authNeccessary := val.asBoolean
      else
        authNeccessary := False;
      if not Sender.Login then
        raise ESMException.CreateFmt('Login not complete :%s',[Sender.Sock.LastErrorDesc]);
      if not Sender.AuthDone and authNeccessary then
          raise ESMException.CreateFmt('Authorization not complete :%s',[Sender.Sock.LastErrorDesc]);
    except
      Sender.Free;
      raise;
    end;
    result := Sender;
  end else
    raise ESMException.Create('new TubMailSender() invalid call');
end;

{ TubMailReceiverProtoObject }

function ubMailReceiver_getMessagesCount_impl(cx: PJSContext; argc: uintN; vals: PjsvalVector; thisObj, calleeObj: PJSObject): jsval; cdecl;
var
  nativeObj: PSMInstanceRecord;
  receiver: TubMailReceiver;
begin
  if not IsInstanceObject(cx, thisObj, nativeObj) then
    raise ESMException.Create('Object not Native');
  receiver := TubMailReceiver(nativeObj.instance);
  Result.asInteger := receiver.StatCount;
end;

function ubMailReceiver_getMessagesCount(cx: PJSContext; argc: uintN; var vp: JSArgRec): Boolean; cdecl;
begin
  Result := nsmCallFunc(cx, argc, vp, [0, integer(@ubMailReceiver_getMessagesCount_impl)]);
end;

function ubMailReceiver_getMessageSize_impl(cx: PJSContext; argc: uintN; vals: PjsvalVector; thisObj, calleeObj: PJSObject): jsval; cdecl;
var
  nativeObj: PSMInstanceRecord;
  mailIndex: integer;
  receiver: TubMailReceiver;
begin
  if not IsInstanceObject(cx, thisObj, nativeObj) then
    raise ESMException.Create('Object not Native');
  mailIndex := vals[0].asInteger;
  if mailIndex = 0 then
    raise ESMException.CreateFmt('TubMailReceiver.mailSize() Error: %s', ['mailIndex start with 1']);
  receiver := TubMailReceiver(nativeObj.instance);

  if receiver.List(mailIndex) then
    Result.asInteger := receiver.ListSize
  else
    raise ESMException.CreateFmt('TubMailReceiver.mailSize() Error: %s', [receiver.ResultString]);
end;

function ubMailReceiver_getMessageSize(cx: PJSContext; argc: uintN; var vp: JSArgRec): Boolean; cdecl;
begin
  Result := nsmCallFunc(cx, argc, vp, [1, ptInt, integer(@ubMailReceiver_getMessageSize_impl)]);
end;

function ubMailReceiver_receive_impl(cx: PJSContext; argc: uintN; vals: PjsvalVector; thisObj, calleeObj: PJSObject): jsval; cdecl;
var
  nativeObj: PSMInstanceRecord;
  mailIndex: integer;
  receiver: TubMailReceiver;
  FMailMessage: TUBMimeMess;
  inst: PSMInstanceRecord;
  fake: JSArgRec;
begin
  if not IsInstanceObject(cx, thisObj, nativeObj) then
    raise ESMException.Create('Object not Native');
  mailIndex := vals[0].asInteger;
  receiver := TubMailReceiver(nativeObj.instance);

  if receiver.Retr(mailIndex) then begin
    New(inst);
//    Result := inst.CreateForObj(cx, FMailMessage, TUBMimeMessProtoObject, thisObj).ToJSValue;
    Result := inst.CreateNew(cx, defineClass(cx, TUBMimeMess, TUBMimeMessProtoObject, PJSRootedObject(nil)), 0, fake);
//    FMailMessage, TUBMimeMessProtoObject, thisObj).ToJSValue;

//    FMailMessage := TUBMimeMess.Create;
    FMailMessage := TUBMimeMess(inst.Instance);
    FMailMessage.MessagePart.TargetCharset := UTF_8;
    FMailMessage.Header.CharsetCode := UTF_8;
    FMailMessage.Clear;
    FMailMessage.Lines.Assign(receiver.FullResult);
    FMailMessage.DecodeMessage;
    FMailMessage.MessagePart.DecodePart;
    FMailMessage.MessagePart.PartBody.LoadFromStream(FMailMessage.MessagePart.DecodedLines);
  end else
    raise ESMException.CreateFmt('TubMailReceiver cannot receive mail with index %d: %s',[mailIndex, receiver.ResultString]);
end;

function ubMailReceiver_receive(cx: PJSContext; argc: uintN; var vp: JSArgRec): Boolean; cdecl;
begin
  Result := nsmCallFunc(cx, argc, vp, [1, ptInt, integer(@ubMailReceiver_receive_impl)]);
end;

function ubMailReceiver_top_impl(cx: PJSContext; argc: uintN; vals: PjsvalVector; thisObj, calleeObj: PJSObject): jsval; cdecl;
var
  nativeObj: PSMInstanceRecord;
  mailIndex, MaxLines: integer;
  receiver: TubMailReceiver;
  FMailMessage: TUBMimeMess;
  inst: PSMInstanceRecord;
begin
  if not IsInstanceObject(cx, thisObj, nativeObj) then
    raise ESMException.Create('Object not Native');
  mailIndex := vals[0].asInteger;
  MaxLines := vals[1].asInteger;
  receiver := TubMailReceiver(nativeObj.instance);

  if receiver.Top(mailIndex, MaxLines) then begin
    FMailMessage := TUBMimeMess.Create;
    FMailMessage.MessagePart.CharsetCode := UTF_8;
    FMailMessage.Header.CharsetCode := UTF_8;
    FMailMessage.Clear;
    FMailMessage.Lines.Assign(receiver.FullResult);
    FMailMessage.DecodeMessage;
    New(inst);
    Result := inst.CreateForObj(cx, FMailMessage, TUBMimeMessProtoObject, PJSRootedObject(nil));
  end else
    raise ESMException.CreateFmt('TubMailReceiver cannot receive mail with index %d: %s',[mailIndex, receiver.ResultString]);
end;

function ubMailReceiver_top(cx: PJSContext; argc: uintN; var vp: JSArgRec): Boolean; cdecl;
begin
  Result := nsmCallFunc(cx, argc, vp, [2, ptInt, ptInt, integer(@ubMailReceiver_top_impl)]);
end;

function ubMailReceiver_mailDelete_impl(cx: PJSContext; argc: uintN; vals: PjsvalVector; thisObj, calleeObj: PJSObject): jsval; cdecl;
var
  nativeObj: PSMInstanceRecord;
  mailIndex: integer;
  receiver: TubMailReceiver;
begin
  if not IsInstanceObject(cx, thisObj, nativeObj) then
    raise ESMException.Create('Object not Native');
  mailIndex := vals[0].asInteger;
  receiver := TubMailReceiver(nativeObj.instance);

  if receiver.Dele(mailIndex) then begin
    Result.asBoolean := True;
  end else
    raise ESMException.CreateFmt('TubMailReceiver cannot delete mail with index %d: %s',[mailIndex, receiver.ResultString]);
end;

function ubMailReceiver_mailDelete(cx: PJSContext; argc: uintN; var vp: JSArgRec): Boolean; cdecl;
begin
  Result := nsmCallFunc(cx, argc, vp, [1, ptInt, integer(@ubMailReceiver_mailDelete_impl)]);
end;

function ubMailReceiver_reconnect_impl(cx: PJSContext; argc: uintN; vals: PjsvalVector; thisObj, calleeObj: PJSObject): jsval; cdecl;
var
  nativeObj: PSMInstanceRecord;
  receiver: TubMailReceiver;
begin
  if not IsInstanceObject(cx, thisObj, nativeObj) then
    raise ESMException.Create('Object not Native');
  receiver := TubMailReceiver(nativeObj.instance);

  receiver.Logout;
  receiver.DoLogin;
  Result.asBoolean := True;
end;

function ubMailReceiver_reconnect(cx: PJSContext; argc: uintN; var vp: JSArgRec): Boolean; cdecl;
begin
  Result := nsmCallFunc(cx, argc, vp, [0, integer(@ubMailReceiver_reconnect_impl)]);
end;

procedure TubMailReceiverProtoObject.InitObject(aParent: PJSRootedObject);
begin
  inherited;
  definePrototypeMethod('getMessagesCount', @ubMailReceiver_getMessagesCount, 0, [jspEnumerate, jspPermanent, jspReadOnly]);
  definePrototypeMethod('getMessageSize', @ubMailReceiver_getMessageSize, 1, [jspEnumerate, jspPermanent, jspReadOnly]);
  definePrototypeMethod('receive', @ubMailReceiver_receive, 1, [jspEnumerate, jspPermanent, jspReadOnly]);
  definePrototypeMethod('top', @ubMailReceiver_top, 2, [jspEnumerate, jspPermanent, jspReadOnly]);
  definePrototypeMethod('deleteMessage', @ubMailReceiver_mailDelete, 1, [jspEnumerate, jspPermanent, jspReadOnly]);
  definePrototypeMethod('reconnect', @ubMailReceiver_reconnect, 0, [jspEnumerate, jspPermanent, jspReadOnly]);
end;

function TubMailReceiverProtoObject.NewSMInstance(aCx: PJSContext; argc: uintN; var vp: JSArgRec): TObject; 
var
  obj: PJSObject;
  val: jsval;
  Receiver: TubMailReceiver;
begin
  if (argc=1) and vp.argv[0].isObject then begin
    obj := vp.argv[0].asObject;
    Receiver := TubMailReceiver.Create;
    try
      if obj.GetProperty(aCx, 'host', val) and val.isString then
        Receiver.targetHost := val.asJSString.ToUTF8(aCx)
      else
        raise ESMException.Create('new TubMailReceiver() host is not specified');
      if obj.GetProperty(aCx, 'port', val) and val.isString then
        Receiver.targetPort := val.asJSString.ToUTF8(aCx)
      else
        raise ESMException.Create('new TubMailReceiver() port is not specified');
      if obj.GetProperty(aCx, 'user', val) and val.isString then
        Receiver.userName := val.asJSString.ToUTF8(aCx)
      else
        Receiver.userName := '';
      if obj.GetProperty(aCx, 'password', val) and val.isString then
        Receiver.password := val.asJSString.ToUTF8(aCx)
      else
        Receiver.password := '';
      if obj.GetProperty(aCx, 'tls', val) and val.isBoolean then
        Receiver.AutoTLS := val.asBoolean;
      Receiver.DoLogin;
    except
      Receiver.Free;
      raise;
    end;
    result := Receiver;
  end else
    raise ESMException.Create('new TubMailReceiver() invalid call');
end;

{ TUBMailPlugin }
procedure TUBMailPlugin.Init(const rec: TSMPluginRec);
begin
  inherited;
  defineEnum(rec.cx, TypeInfo(TubSendMailBodyType), rec.Exp);
  defineEnum(rec.cx, TypeInfo(TubSendMailAttachKind), rec.Exp);

  defineClass(rec.cx, TubMailSender, TubMailSenderProtoObject, rec.Exp);
  defineClass(rec.cx, TubMailReceiver, TubMailReceiverProtoObject, rec.Exp);
  defineClass(rec.cx, TMessHeader, TMessHeaderProtoObject, rec.Exp);
  defineClass(rec.cx, TMimePart, TMimePartProtoObject, rec.Exp);
  defineClass(rec.cx, TUBMimeMess, TUBMimeMessProtoObject, rec.Exp);

end;

end.
