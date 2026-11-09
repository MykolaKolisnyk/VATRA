package main

import (
 "bytes"
 "fmt"
 "html"
 "html/template"
 "os"
 "regexp"
 "strings"
)

var names = []string{"confirmation","invite","recovery","magic-link","email-change","reauthentication","password-changed","email-address-changed"}
var callbacks = map[string]string{
 "confirmation":"account.html?token_hash=vatra_test_hash_2026&type=email",
 "invite":"account.html?token_hash=vatra_test_hash_2026&type=invite",
 "recovery":"reset.html?token_hash=vatra_test_hash_2026&type=recovery",
 "magic-link":"account.html?token_hash=vatra_test_hash_2026&type=magiclink",
 "email-change":"account.html?token_hash=vatra_test_hash_2026&type=email_change",
}
var href = regexp.MustCompile(`(?i)href="([^"]*)"`)
func require(ok bool, message string){if !ok {panic(message)}}

func main(){
 for _,name := range names {
  raw,err:=os.ReadFile("email-templates/"+name+".html"); if err!=nil {panic(err)}
  source:=string(raw)
  require(strings.Count(source,`{{ if eq .Data.preferred_locale "en" }}`)>=2,name+": missing bilingual branches")
  require(!strings.Contains(strings.ToLower(source),"<script"),name+": email must not execute JavaScript")
  require(strings.Contains(source,`width="100%"`)&&strings.Contains(source,"max-width:580px"),name+": missing fluid email table")
  tmpl,err:=template.New(name).Option("missingkey=error").Parse(source)
  if err!=nil {panic(fmt.Errorf("%s: %w",name,err))}
  for _,locale:=range []string{"uk","en"} {
   data:=map[string]any{
    "Data":map[string]string{"preferred_locale":locale},"Token":"12345678","TokenHash":"vatra_test_hash_2026",
    "RedirectTo":"https://mykolakolisnyk.github.io/VATRA/reset.html",
    "Email":"user@example.com","OldEmail":"old@example.com","NewEmail":"new@example.com",
   }
   var out bytes.Buffer
   if err:=tmpl.Execute(&out,data);err!=nil {panic(fmt.Errorf("%s (%s): %w",name,locale,err))}
   rendered:=out.String()
   prefix:=name+" ("+locale+"): "
   require(strings.Contains(rendered,`<html lang="`+locale+`">`),prefix+"wrong language")
   require(!strings.Contains(rendered,"{{")&&!strings.Contains(rendered,"<no value>"),prefix+"unresolved variable")
   require(strings.Contains(rendered,`alt="VATRA"`),prefix+"missing logo alternative")
   for _,m:=range href.FindAllStringSubmatch(rendered,-1){
    link:=html.UnescapeString(m[1])
    require(strings.HasPrefix(link,"https://")||strings.HasPrefix(link,"mailto:"),prefix+"invalid email link: "+link)
   }
   if route,found:=callbacks[name];found{
    require(strings.Contains(html.UnescapeString(rendered),route),prefix+"incorrect one-time cross-device URL")
   }
   if name=="recovery"||name=="magic-link"||name=="reauthentication"{
    require(strings.Contains(rendered,"12345678"),prefix+"OTP code missing")
   }
   if name=="email-change"{
    require(strings.Contains(rendered,"new@example.com"),prefix+"new address missing")
   }
   if name=="email-address-changed"{
    require(strings.Contains(rendered,"old@example.com")&&strings.Contains(rendered,"user@example.com"),prefix+"security notification missing addresses")
   }
  }
  fmt.Println("VATRA "+name+": actual Go template rendering UK + EN, links and layout guards passed")
 }
}
