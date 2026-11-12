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
var localizedSubjects = map[string][2]string{
 "confirmation":{"Підтвердження пошти","Confirm email"},
 "invite":{"Запрошення","Invitation"},
 "magic-link":{"Код входу","Sign-in code"},
 "email-change":{"Підтвердження нової пошти","Confirm new email"},
 "recovery":{"Відновлення пароля","Password recovery"},
 "reauthentication":{"Код підтвердження","Verification code"},
 "password-changed":{"Пароль змінено","Password changed"},
 "email-address-changed":{"Пошту змінено","Email changed"},
}
var callbacks = map[string]string{
 "confirmation":"verify?token_hash=ci_example_hash_only&type=email",
 "invite":"verify?token_hash=ci_example_hash_only&type=invite",
 "recovery":"reset?token_hash=ci_example_hash_only&type=recovery",
 "magic-link":"verify?token_hash=ci_example_hash_only&type=magiclink",
 "email-change":"verify?token_hash=ci_example_hash_only&type=email_change",
}
var href = regexp.MustCompile(`(?i)href="([^"]*)"`)
func require(ok bool, message string){if !ok {panic(message)}}

func main(){
 readme,err:=os.ReadFile("email-templates/README.md")
 if err!=nil {panic(err)}
 for _,name := range names {
  raw,err:=os.ReadFile("email-templates/"+name+".html"); if err!=nil {panic(err)}
  source:=string(raw)
  require(strings.Count(source,`{{ if eq .Data.preferred_locale "en" }}`)>=2,name+": missing bilingual branches")
  require(!strings.Contains(strings.ToLower(source),"<script"),name+": email must not execute JavaScript")
  require(strings.Contains(source,`width="100%"`)&&strings.Contains(source,"max-width:580px"),name+": missing fluid email table")
  tmpl,err:=template.New(name).Parse(source)
  if err!=nil {panic(fmt.Errorf("%s: %w",name,err))}
  for _,locale:=range []string{"uk","en","missing"} {
   preference:=map[string]string{}
   if locale!="missing" {preference["preferred_locale"]=locale}
   subjectText:=`{{ if eq .Data.preferred_locale "en" }}VATRA · `+localizedSubjects[name][1]+`{{ else }}VATRA · `+localizedSubjects[name][0]+`{{ end }}`
   require(strings.Contains(string(readme),"`"+subjectText+"`"),name+": README subject does not match the locale audit")
   subjectTemplate,err:=template.New(name+"-subject").Parse(subjectText)
   if err!=nil {panic(fmt.Errorf("%s: invalid Subject template: %w",name,err))}
   data:=map[string]any{
    "Data":preference,"Token":"123456","TokenHash":"ci_example_hash_only",
    "RedirectTo":"https://mykolakolisnyk.github.io/VATRA/reset",
    "Email":"user@example.com","OldEmail":"old@example.com","NewEmail":"new@example.com",
   }
   var subjectOut bytes.Buffer
   if err:=subjectTemplate.Execute(&subjectOut,data);err!=nil {panic(fmt.Errorf("%s (%s): Subject render failed: %w",name,locale,err))}
   expectedSubject:="VATRA · "+localizedSubjects[name][0]
   if locale=="en"{expectedSubject="VATRA · "+localizedSubjects[name][1]}
   require(subjectOut.String()==expectedSubject,name+" ("+locale+"): Subject must contain only its own language")
   var out bytes.Buffer
   if err:=tmpl.Execute(&out,data);err!=nil {panic(fmt.Errorf("%s (%s): %w",name,locale,err))}
   rendered:=out.String()
   if os.Getenv("VATRA_AUDIT_EMAIL_OUTPUT")=="1"&&locale!="missing"{
    if err:=os.MkdirAll("audit-email",0755);err!=nil{panic(err)}
    if err:=os.WriteFile("audit-email/"+name+"-"+locale+".html",[]byte(rendered),0644);err!=nil{panic(err)}
   }
   prefix:=name+" ("+locale+"): "
   expected:=locale
   if locale=="missing"{expected="uk"}
   require(strings.Contains(rendered,`<html lang="`+expected+`">`),prefix+"wrong language")
   require(!strings.Contains(rendered,"{{")&&!strings.Contains(rendered,"<no value>"),prefix+"unresolved variable")
   require(strings.Contains(rendered,`alt="VATRA"`),prefix+"missing logo alternative")
   for _,m:=range href.FindAllStringSubmatch(rendered,-1){
    link:=html.UnescapeString(m[1])
    require(strings.HasPrefix(link,"https://")||strings.HasPrefix(link,"mailto:"),prefix+"invalid email link: "+link)
    require(!strings.Contains(link,".html"),prefix+"legacy .html link must use a clean VATRA route: "+link)
   }
   require(strings.Contains(rendered,"https://mykolakolisnyk.github.io/VATRA/assets/logo/vatra-logo.png"),
    prefix+"logo URL must match official VATRA brand asset")
   if name=="password-changed"{
    require(strings.Contains(rendered,"https://mykolakolisnyk.github.io/VATRA/forgot"),
     prefix+"the security notification must link to canonical /forgot")
   }
   if route,found:=callbacks[name];found{
    require(strings.Contains(html.UnescapeString(rendered),route),prefix+"incorrect one-time cross-device URL")
   }
   if name=="recovery"||name=="magic-link"||name=="reauthentication"{
    require(strings.Contains(rendered,"123456"),prefix+"OTP code missing")
   }
   if name=="email-change"{
    require(strings.Contains(rendered,"new@example.com"),prefix+"new address missing")
   }
   if name=="email-address-changed"{
    require(strings.Contains(rendered,"old@example.com")&&strings.Contains(rendered,"user@example.com"),prefix+"security notification missing addresses")
   }
  }
  fmt.Println("VATRA "+name+": Go Body + Subject rendered for UK, EN, missing locale; links and layout guards passed")
 }
}
