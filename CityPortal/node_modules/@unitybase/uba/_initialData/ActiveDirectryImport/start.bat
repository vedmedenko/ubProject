rem This script import users from Active directory
rem Only for windows Server 2008 or later
rem Unity Base connection parameters:
set UBUser=admin
set UBPass=password 
set UBApp=appName 
rem Active directory parameters:
set domainName=myDomain.com


powerShell.exe .\installAD.ps1
powerShell.exe .\ExportADUsers.ps1 -domainName %domainName%
UB.exe .\importADUser.js -domainName %domainName% -u %UBUser% -p %UBPass%