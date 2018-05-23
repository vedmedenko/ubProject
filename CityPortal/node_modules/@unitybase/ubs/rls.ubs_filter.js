/*global RLS, Session, TubDataStore */

var RLS = UB.ns('RLS');
RLS.ubs_filter_owner = function(){
    return  '( [owner] = :(' + Session.userID + '): )';
};

/** 
 * Dirty hack for federalized entities (for example ubs_numcounter) work without FED model.
 *
 * FED model define good realization of RLS.federalize - this is only stub
 */
RLS.federalize = function(){
    return '(1=1)';
};

