/** Brauzer cache va eski PWA qoldiqlarini React yuklanishidan OLDIN bir marta tozalaydi. */
export const CLIENT_BOOT_SCRIPT = `(function(){
var CV="5",CK="mysaloon-ui-cache";
function purge(cb){
  var t=[];
  if("serviceWorker"in navigator)t.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister()}))}));
  if("caches"in window)t.push(caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k)}))}));
  if(t.length)Promise.all(t).then(function(){if(cb)cb()});else if(cb)cb();
}
try{
  if(localStorage.getItem(CK)===CV)return;
  localStorage.setItem(CK,CV);
  purge(function(){
    var u=new URL(location.href);
    u.searchParams.set("_v",Date.now().toString(36));
    location.replace(u.toString());
  });
}catch(e){}
})();`;
