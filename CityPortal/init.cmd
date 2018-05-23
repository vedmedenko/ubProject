call ubcli createStore
if errorlevel 1 goto err

call ubcli initDB -u admin -p admin -drop -create -host http://localhost:888
if errorlevel 1 goto err

call ubcli generateDDL -u admin -p admin -host http://localhost:888 -autorun
if errorlevel 1 goto err

call ubcli initialize -u admin -p admin -host http://localhost:888
if errorlevel 1 goto err

goto eof

:err 
echo Something wrong
exit 1

:eof
