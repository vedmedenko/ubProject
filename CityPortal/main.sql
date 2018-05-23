--##############     start script for conection "main" #######
/*
 $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ 
 Attantion! Achtung! Vnimanie! 


Attempt to alter a column uba_els.code as (typeChanged: false, sizeChanged: true, allowNullChanged: false
Attempt to alter a column ubs_settings.name_uk as (typeChanged: false, sizeChanged: false, allowNullChanged: true
Attempt to alter a column ubm_desktop.caption_uk as (typeChanged: false, sizeChanged: false, allowNullChanged: true
Attempt to alter a column ubm_enum.name_uk as (typeChanged: false, sizeChanged: false, allowNullChanged: true
Attempt to alter a column ubm_navshortcut.caption_uk as (typeChanged: false, sizeChanged: false, allowNullChanged: true
Attempt to alter a column req_reqList.mi_data_id as (typeChanged: false, sizeChanged: false, allowNullChanged: true
Attempt to alter a column req_reqList.mi_dateFrom as (typeChanged: false, sizeChanged: false, allowNullChanged: true
Attempt to alter a column req_reqList.mi_dateTo as (typeChanged: false, sizeChanged: false, allowNullChanged: true
Attempt to alter a column req_subDepart.mi_deleteDate as (typeChanged: false, sizeChanged: false, allowNullChanged: true

 $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ 
*/

 
-- ! update values for known or estimated changes
--#############################################################
update ubs_settings set name_uk = ID where name_uk is null;
--
update ubm_desktop set caption_uk = ID where caption_uk is null;
--
update ubm_enum set name_uk = ID where name_uk is null;
--
update ubm_navshortcut set caption_uk = ID where caption_uk is null;
--
update req_reqList set mi_data_id = (select min(id) from req_reqList) where mi_data_id is null;
--
update req_reqList set mi_dateFrom = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') where mi_dateFrom is null;
--
update req_reqList set mi_dateTo = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') where mi_dateTo is null;
--
update req_subDepart set mi_deleteDate = '9999-12-31' where mi_deleteDate is null;