@echo off
if not defined SRC (
  echo SRC environment variable must be defined
  exit 1
)
call %SRC%\bin\setEnv.cmd
call %SRC%\bin\setCompilerEnv.cmd
if not exist %~dp0x32 mkdir %~dp0x32
cd %~dp0..\src
%DCC7% -$D- -$L- -$Y- -B -Q -DRELEASE%SM52DEF% -E..\bin\x32 ^
  -I%SYN_LIB% ^
  -R%SYN_LIB% ^
  -U%UNIT_PATH%;"%DELPHI_7%\lib\Win32\release" ^
  -N%DCU7_PATH% ^
  UBMail.dpr

if not exist %~dp0x64 mkdir %~dp0x64
%DCC64% -$D- -$L- -$Y- -B -Q -DRELEASE%SM52DEF% -E..\bin\x64 ^
  -NSSystem;Winapi;System.Win; ^
  -I%SYN_LIB% ^
  -R%SYN_LIB% ^
  -R%LIB%\Synopse ^
  -U%UNIT_PATH%;"%DELPHI_XE2%\lib\Win64\release" ^
  -N%DCUX64_PATH% ^
  UBMail.dpr