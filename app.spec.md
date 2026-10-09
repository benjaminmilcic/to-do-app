Ich will eine klassische ToDo App. Die App soll eine multinutzer app sein. also man soll sich registrieren und einloggen koennen. Und ausserdem soll der login ueber den google account moeglich sein. Ohne login soll sie nicht nutzbar sein. wie bei vielen apps die es so gibt, soll sich der login gemerkt werden, also dass ich mich beim starten nicht immer wieder einloggen muss, sondern dass nur einmal tue.
Die App soll daten immer synchronisieren. also wenn ich ein todo auf dem smartphone anlege soll es gleich auf dem pc auch sichtbar sein. das gilt natuerlich auch fuer loeschen und so.
Es sollen mehrere Sessions moeglich sein. Also die App soll zeitgleich auf mehreren pcs und smartphones laufen konnen. Mit entsprechender synchonisation.
Die App soll mit Angular/Nestjs/mysql/ionic gebaut werden. Die App soll auf dem Smartphone als app laufen, deshalb Ionic, aber auch im Browser. Die Browser App soll eine PWA App sein, also dass sie auf dem pc ohne die Browsernavigation/menu laeuft.
Die app soll local im dev mode auf localhost funktionieren, als auch auf meinem server.
als server nimm meinen bereits fuer benjamin-milcic.dev verwendeten server.
fuer den server habe ich dort auf dem server eine zusaetzliche session von claude code gestartet. verbinde dich damit und lass claude code dort notwendige schritte mit mir kommunizieren und ausfuehren.
als backend soll nestjs verwendet werden. und als datenbank mysql. alle zugangsdaten findest du in den projekten "D:\eigene Projekte\aznw-routes" und "D:\eigene Projekte\nest-aznw-api". die app soll auf dem server unter einer subdomain von benjamin-milcic.dev laufen und zwar todo-app.benjamin-milcic.dev
Informiere mich hier oder in der server session wenn aenderungen auf cloudflare erforderlich sind, weil die domain dort registriert ist. Denke auch daran, dass es eine weiterleitungsdomain auf-zu-neuen-welten.de gibt. wenn da aenderungen notwendig sind, informiere mich.
das backend soll in einem eigenen prozess starten, also nicht teil von api.benjamin-milcic.dev sein. aber es soll natuerlich bei jedem server neustart wieder gestartet werden. also produktion ready.
als datenbank soll die bereits fuer api.benjamin-milcic.dev verwendete datenbank genutzt werden. zugangsdaten findest du in den oben genanten repos und auf dem server.
Ich werde dieses Projekt natuerlich auf github stellen. Bitte erzeuge workflows mit github actions, damit bei jedem commit alles wieder auf dem server deployt wird. zugangsdaten findest du in den oben genannten repos. wenn aktionen von mir notwendig sind, wie github secrets, teile mir das mit.

Alle Kommentare die du in den Code einfuegst, sollen in englisch sein.

Denke daran, dass ich das repo oeffentlich machen will. also keine prekaeren daten in das repo. alles sowas in .env dateien.
auf dem server erstelle dafuer eine nicht oeffentliche eigene konfigurations datei. todo-app.env oder so. fuer benjamin-milcic.dev existiert schon auf dem server ein environment datei. app.env oder so. da soll das nicht rein. eigene datei fuer das projekt.

Lass dir ruhig zeit bei der ausfuehrung der schritte. wenn es lange, mehrere stunden oder so dauert, kein problem. mach es wirklich gruendlich.

denke bei der subdomain auf dem server daran, dass es da fuer benjamin-milcic.dev ne PageNotFound Komponente gibt fuer unbekannte routes. also dass da nichts kollidiert.

Local gibt es auch eine datenbank in den anderen oben genannten repos. aber fuer das projekt hier soll immer, auch wenn die app auf localhost im dev mode laeuft, die datenbank des servers verwendet werden. Wenn dafuer aenderungen an der cors policy der datenbank notwendig ist, informiere mich darueber, welche auswirkungen das auf mein projekt der anderen beiden repos hat.

bereite auf dem server schon ein verzeichniss vor, in das das fertige apk fuer die smartphone version kopiert wird, und fuege in der webversion einen link ein, wo man das apk downloaden kann.
fuege auch einen workflow ein, dass bei einem neuen commit, das apk mit android studio neu erstellt wird und dann in das verzeichniss kopiert wird. android studio ist auf diesem rechner installiert.

Fuege noch eine Readme.md hinzu die auch auf github angezeigt wird. Mit infos zur app, start anweisungen und hinweisen, dass die deploy workflows angepasst bzw geloescht werden muessen, da sie speziel auf meinen usecase implementiert wurden. denn das projekt sollen auch andere leute von github clonen koennen und ausfuehren/hosten(eigener) konnen.

Erstelle ein schoenes favicon/app icon fuer die app.