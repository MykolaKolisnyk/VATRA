import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const source=await readFile("assets/js/external-links.js","utf8");
const window={},document={addEventListener(){}};
runInNewContext(source,{window,document,URL});
const inspect=url=>window.VATRA_EXTERNAL_LINKS.inspect(url,"https://vatra.example/feed");
assert.equal(inspect("/profile"),null);assert.equal(inspect("mailto:help@example.org"),null);
assert.equal(inspect("javascript:alert(1)"),null);
const ordinary=inspect("https://example.org/path?a=1#part");assert.equal(ordinary.suspicious,false);assert.equal(ordinary.href,"https://example.org/path?a=1&utm_source=vatra#part");
assert.equal(inspect("https://example.org/?utm_source=partner").href,"https://example.org/?utm_source=partner");
assert.equal(inspect("https://example.org/?token=secret").href,"https://example.org/?token=secret");
assert.equal(inspect("https://example.org/oauth/callback?code=test").href,"https://example.org/oauth/callback?code=test");
for(const url of ["http://example.org","https://bit.ly/test","https://127.0.0.1","https://xn--e1afmkfd.xn--p1ai","https://example.org:8443","https://example.org@other.example"])assert.equal(inspect(url).suspicious,true,url);
const cases=[
 ["http://example.org","http"],["https://sub.bit.ly/a","short"],
 ["https://0x7f000001/","host"],["https://[::1]/","host"],["https://localhost/","host"],
 ["https://example.org:8443","host"],["https://xn--e1afmkfd.xn--p1ai","idn"],
 ["https://example.org/a\u202Eb","idn"],["https://example.org/a%0Ab","idn"],
 ["https://google.com@other.example","credentials"],
 ["https://google.example.org","brand"],["https://googel.example.org","brand"],
 ["https://facebook-login.example.org","brand"],
 ["https://example.org/?redirect=https%3A%2F%2Fother.example","redirect"],
 ["https://example.org/?next=%2F%2Fother.example","redirect"],
 ["https://example.org/setup%2Eexe","executable"]
];
for(const [address,reason] of cases){
 const result=inspect(address);
 assert.ok(result.suspicious&&result.reasons.includes(reason),address+" "+reason);
 assert.equal(result.href,new URL(address).href,"Suspicious URLs must never receive attribution");
}
for(const address of ["https://accounts.google.com","https://www.google.com.ua","https://www.facebook.com","https://login.microsoftonline.com","https://ordinary.example.org/path","https://example.org/?next=%2Fhome"]){
 assert.equal(inspect(address).suspicious,false,address);
}
for(const address of ["https://example.org/?X-Amz-Signature=abc%20def","https://example.org/?Policy=abc&Key-Pair-Id=123","https://example.org/?UTM_SOURCE=partner","https://example.org/?next=%2Fhome","https://example.org/download/file","https://example.org/?sig=abc%2Bdef"]){
 assert.equal(inspect(address).href,address,"Sensitive and existing attribution URLs must remain unchanged");
}
assert.equal(inspect("https://example.org/?q=a%20b&empty=#x").href,"https://example.org/?q=a%20b&empty=&utm_source=vatra#x");
assert.ok(window.VATRA_EXTERNAL_LINKS.inspect("https://example.org/","https://vatra.example/","https://exam\u200bple.org/").reasons.includes("idn"));
for(const locale of ["uk","en","pl","de","fr","it","ka","bg"]){
 const catalog=JSON.parse(await readFile("assets/i18n/"+locale+".json","utf8"));
 for(const key of ["Незахищене HTTP-з’єднання.","Скорочена адреса приховує кінцевий сайт.","Незвична адреса сервера або порт.","Міжнародний домен або приховані символи в адресі.","Адреса містить облікові дані.","Домен може імітувати відомий сервіс.","Адреса може перенаправити на інший сайт.","Посилання може завантажити виконуваний файл."])assert.ok(typeof catalog[key]==="string"&&catalog[key].trim(),locale+" "+key);
}
console.log("VATRA outbound link heuristics, attribution preservation and eight localized warning reasons passed.");
