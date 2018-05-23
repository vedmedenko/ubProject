-- select * from uba_role
-- select * from uba_subject

insert into uba_subject (name,  ID, sType, mi_unityEntity)
select 'User',  3, 'R', 'uba_role'

insert into uba_role (name, description, sessionTimeout, allowedAppMethods, ID, mi_owner, mi_createUser, mi_modifyUser, mi_createDate, mi_modifyDate)
select 'User', 'User build-in role', 30, 'logout,changePassword,setDocument,getDocument', 3, 10, 10, 10, getDate(), getDate() 

insert into uba_subject (name,  ID, sType, mi_unityEntity)
select 'Anonymous',  2, 'R', 'uba_role'

insert into uba_role (name, description, sessionTimeout, allowedAppMethods, ID, mi_owner, mi_createUser, mi_modifyUser, mi_createDate, mi_modifyDate)
select 'Anonymous', 'Anonymous build-in role', 1000, '', 2, 10, 10, 10, getDate(), getDate() 

insert into uba_subject (name,  ID, sType, mi_unityEntity)
select 'Supervisor',  4, 'R', 'uba_role'

insert into uba_role (name, description, sessionTimeout, allowedAppMethods, ID, mi_owner, mi_createUser, mi_modifyUser, mi_createDate, mi_modifyDate)
select 'Supervisor', 'Supervisor build-in role', 1000, '', 4, 10, 10, 10, getDate(), getDate() 

insert into uba_subject (name,  ID, sType, mi_unityEntity)
select 'Developer',  5, 'R', 'uba_role'

insert into uba_role (name, description, sessionTimeout, allowedAppMethods, ID, mi_owner, mi_createUser, mi_modifyUser, mi_createDate, mi_modifyDate)
select 'Developer', 'Developer build-in role', 1000, '', 5, 10, 10, 10, getDate(), getDate() 

insert into uba_subject (name,  ID, sType, mi_unityEntity)
select 'Monitor',  6, 'R', 'uba_role'

insert into uba_role (name, description, sessionTimeout, allowedAppMethods, ID, mi_owner, mi_createUser, mi_modifyUser, mi_createDate, mi_modifyDate)
select 'Monitor', 'Developer build-in role', 1000, 'stat', 6, 10, 10, 10, getDate(), getDate() 

 
update uba_role set name = 'Admin'
where name = 'admins'

update uba_role set allowedAppMethods = 'auth,timeStamp,statics,getAppInfo,models,getDomainInfo,ubql,rest'
where name = 'Everyone'

-- select * from uba_role

--@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
--- after generate DDL

insert into uba_auditTrail
select * from ubs_audit

drop table ubs_audit

