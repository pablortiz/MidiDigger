# MIDI Digger — Ayuda

Guía de las funciones del programa, por secciones. Se irá completando.

## Índice

- [Biblioteca (pestaña Files)](#biblioteca-pestaña-files)
  - [Moverse por la lista](#moverse-por-la-lista)
  - [La línea File y 📂](#la-línea-file-y-)
  - [Arrastrar archivos desde el Explorador](#arrastrar-archivos-desde-el-explorador)
  - [Pestañas de trabajo](#pestañas-de-trabajo)
- [Favoritos (pestaña Favorites)](#favoritos-pestaña-favorites)
- [Loops](#loops)
  - [Guardar y abrir loops](#guardar-y-abrir-loops)
  - [Atajos de teclado](#atajos-de-teclado)
  - [Tail y push: que las frases no empiecen ni acaben en seco](#tail-y-push-que-las-frases-no-empiecen-ni-acaben-en-seco)
  - [Altura y escala: Key, Mode y los botones ▼▲ / 8va](#altura-y-escala-key-mode-y-los-botones--8va)
  - [Capas, half-time / double-time y groove de la batería](#capas-half-time--double-time-y-groove-de-la-batería)
- [El sonido de cada fila (♪ Choose row sound)](#el-sonido-de-cada-fila--choose-row-sound)
  - [Elegir el sonido](#elegir-el-sonido)
  - [Pestaña Midigrid](#pestaña-midigrid)
  - [Pestaña Piano](#pestaña-piano)

---

## Biblioteca (pestaña Files)

### Moverse por la lista

- El análisis de la biblioteca solo empieza al pulsar **Analyse**, no al abrir o reconectar la carpeta. Abrir un archivo individual puede analizar ese archivo al momento.
- **Cada 1.000 archivos analizados, Analyse se para y pregunta**:
  - **1,000 more**: analiza otros 1.000 y vuelve a preguntar.
  - **Analyse all**: analiza el resto sin preguntar más, hasta la próxima vez que pulses Analyse.
  - **Use these files** (o Esc): se para ahí y trabajas con lo analizado; Parts y Fill ya lo usan. **Analyse** sigue más tarde donde se quedó, sin repetir nada.
- **Clic** en un archivo: lo abre (en un loop, lo abre en **Explore** para llevar compases al loop).
- **↑ ↓**: el archivo de arriba o de abajo, abierto como con un clic. La lista acompaña la selección. Si estás escuchando, sigue sonando con el archivo nuevo.
- **Enter**: reproduce el archivo seleccionado cuando estás en una canción. En la tabla Files de Data también inicia su reproducción.
- En **Data → Fragments**, haz doble clic en la miniatura del fragmento seleccionado para escucharlo.
- **Clic derecho** en un archivo:
  - **Open**: abrirlo.
  - **📂 Show in Explorer**: mostrarlo en el Explorador de Windows (solo dentro de LUNA).
  - **Copy path**: copiar su ruta.
- Las columnas **Length** y **BPM** muestran la duración y el tempo de cada archivo.

### La línea File y 📂

Encima de las pistas del archivo abierto:

`File  D:\midi\Various Artists\-hwdplove.mid · 105 BPM · 4/4 · Eb major · 4:06`

- Tempo, compás, tonalidad y duración del archivo. Si todavía no está analizado, la tonalidad aparece al terminar el análisis.
- **📂** al final de la línea: abre el Explorador con el archivo seleccionado (solo dentro de LUNA).

### Arrastrar archivos desde el Explorador

Arrastra uno o varios `.mid` desde el Explorador y suéltalos sobre MIDI Digger (la lista de Files se marca con un borde discontinuo).

| Si estás en… | Qué pasa |
|---|---|
| **Una canción** | El archivo aparece **arriba de la lista** de Files, marcado con **⤵**, y **se abre** en su pestaña, analizado (sus partes salen también en Parts). |
| **Un loop** | Se abre en **Explore**, para elegir compases y arrastrarlos al loop. |

- Con varios archivos, todos se añaden a la lista y se abre el primero.
- Lo que no sea `.mid` / `.midi` se descarta y se avisa en el log.
- Los archivos soltados son **temporales** en la lista: desaparecen al cambiar de carpeta.
- Dentro de LUNA llegan con su ruta real. En algunos casos (LUNA 3.1 tras cerrar y abrir la ventana del add-on) llegan sin ruta: la pestaña muestra «Dropped\…» y no hay 📂.

### Pestañas de trabajo

- La barra de pestañas (**Song**, los archivos abiertos, los loops y **+ New loop**) se queda **fija arriba** al hacer scroll, en las canciones y en los loops.
- Cambiar de pestaña **no cambia el panel izquierdo**: si estabas en Parts o en Files, sigues ahí con lo que tenías (la búsqueda, sus resultados, el archivo seleccionado).
- En un loop, haz clic en el nombre junto a **Explore** para abrir ese MIDI como canción en su pestaña; el loop permanece abierto.
- **⇡ Loop from song** y **⇉ All fragments** llevan al loop **solo las pistas marcadas en Explore**. Un clic en el nombre de una pista la marca o la desmarca, y las no marcadas se ven atenuadas.
  - Al abrir una canción, la marcada es la primera pista. Si no hay ninguna marcada, llevan todas.
  - Las filas de esa canción que ya estaban en el loop y cuya pista no está marcada se quedan como están.
  - El log dice cuántas pistas marcadas se han llevado.
- **⇉ All fragments** (junto a *⇡ Loop from song*, con una canción en Explore) pone **cada instrumento de la canción en una fila** y le coloca **sus fragmentos únicos**, los que marca *Fragments*, cada uno una vez. Van **uno detrás de otro desde el compás 1**, en el orden en que suenan en la canción.
  - El que no cabe en los compases que quedan **se corta en el último compás** del loop. Los que ya no tienen sitio se quedan fuera, y el log dice cuántos.
  - Cuando se acaban los fragmentos de un instrumento, **el resto de su fila queda vacío**. Un instrumento sin fragmentos no entra.
  - Como en Loop from song: si el loop está vacío, toma el compás, la tonalidad y el tempo de la canción; si no, los fragmentos se transportan a la tonalidad del loop. Las filas 🔒 no se tocan y solo cabe una batería.
  - Pulsarlo otra vez sustituye esas filas, conservando el sonido elegido, y da el mismo resultado. **↶** lo deshace de una vez.
- **Parts** tiene un buscador de texto y filtros de rol con iconos, Instrument, Gesture, Length, Meter, Key, Min/Max BPM, Energy y Repeats; también ofrece orden contra el loop (Fit / Fill %), el botón **↓ Sort** y la casilla Fragments.
  - El **texto** busca archivo, pista o instrumento, y también **gestos escritos** (*snare roll*, *redoble de caja*, *arpegio de piano*, *backbeat*…). El botón **?** abre la ayuda de búsqueda musical, y sus ejemplos se escriben en el buscador de Parts.
  - **Gesture**, **Length** y **Energy** se miran en los fragmentos: sale cada parte que tenga un fragmento que cumpla, y la tarjeta se pone en ese fragmento.
  - **Repeats**: solo fragmentos que se repiten en su canción, es decir, que suenan dos veces o más. No tiene que ver con quitar copias, que Parts hace siempre (ver más abajo).
- En **Parts**, la casilla **Fragments** muestra u oculta los fragmentos en la miniatura de cada instrumento (las bandas de color y el marco blanco del elegido). 
  - **Puesta**, un clic en la miniatura elige el fragmento que hay debajo.
  - **Quitada**, solo se ven las notas, y un clic en la miniatura **lo escucha desde ese punto**, sin ajustarse a ningún fragmento:
    - en una canción, suena la pista entera de esa parte, sola, desde donde pinchas; otro clic salta a otro punto y ▶ lo para;
    - en un loop, suena sobre el loop, a su tempo, un tramo del largo del loop que empieza en el compás donde pinchas (si el loop está parado, suena sola).
- Cada tarjeta de **Parts** dice **cuántos compases tiene el fragmento elegido** (por ejemplo, *8 bars*: el marco blanco de la miniatura) y **el tempo de su canción** (*120 BPM*). Pasa el ratón por *8 bars* para ver qué compases de la canción son. Si eliges otro fragmento en la miniatura, cambia.
- **Qué está en el loop**: con un loop abierto, la tarjeta cuyo fragmento suena en el loop lleva **● In loop** y una raya azul a la izquierda; **○ In loop** quiere decir que de esa parte hay otros compases en el loop. Pasa el ratón por encima para ver en qué fila y qué compases. Vale para lo que arrastras, lo que añade ✨ Fill y lo que pone Arrange.
- **En el loop**, pasa el ratón por un pad o por el nombre de una fila: dice **de qué archivo y de qué compases** viene (*From american_caravan.mid · bars 49–56*). Los loops guardados antes de este cambio dicen el archivo, pero no los compases.
- En **Parts**, el desplegable junto a **↓ Sort** elige por qué ordenar:
  - **Fit**: solo cómo encajan sus notas y su ritmo con el loop (o con la sesión de LUNA con 🎯). Es lo más directo para buscar "lo que suena bien con esto".
  - **Fill %**: la puntuación completa de Fill (45 % Fit + 25 % Length + 15 % Dynamics + 5 % Activity + 10 % Role), medida contra el loop tal como está ahora. Cada parte se pone en **su mejor fragmento** y muestra un recuadro **Fill %** junto al Fit; pasa el ratón por encima para ver cada medida. Salen **todas**, también las que Fill no ofrecería (por debajo del 55 %, en rojo), sin su criterio de variedad. Solo con un loop (en New loop) y sin 🎯; si no, ordena por Fit.
    - **Se calcula de nuevo cada vez que eliges Fill %** (o pulsas ↓ Sort), con el loop tal como está en ese momento y con el mismo contexto que usaría ✨ Fill (*What we have · comparison context before Fill*). Cada parte se vuelve a poner en el fragmento que mejor puntúa.
    - **Sin pads seleccionados**, como Fill al añadir un instrumento: contra el loop entero.
    - **Con pads seleccionados**, como Fill sobre esos compases: contra el loop sin esos pads y solo en esos compases, con la dinámica y la actividad de las filas seleccionadas. El largo que mejor puntúa es entonces el de la selección.
    - Encima de la lista, una línea azul dice contra qué se ha calculado.
- **Los avisos de encima de la lista de Parts** (los archivos vistos hasta ahora, contra qué se calculó Fill %) se cierran con su **✕**.
  - Un aviso cerrado no vuelve mientras diga lo mismo, aunque cambien sus números (por ejemplo, los archivos vistos durante Analyse).
  - Vuelve si dice otra cosa, como *"The loop has changed since: ↓ Sort…"*, para que no te pierdas que conviene volver a ordenar.
  - Con **Fit** o **Fill %** y sin loop ni 🎯 no hay nada con qué comparar: la lista sale en el orden de los archivos o, si buscas un gesto, de más a menos clara.
  - **Tempo**: en un loop, primero las de tempo **más cercano al del loop** (el que tenga en ese momento); sin loop, de más lento a más rápido. **Longest**: el fragmento más largo primero. **Random**: al azar; **↓ Sort** vuelve a barajar.
  - **Si cambias el loop después de ordenar** (sus notas, sus filas, el tempo, los pads seleccionados o Safe/Normal/Daring), la lista no se reordena sola, porque con una biblioteca grande Fill % puede tardar varios segundos. Lo que pasa es que **↓ Sort se ilumina en amarillo** y la línea azul dice *"The loop has changed since: ↓ Sort to sort again"*. Al pulsarlo, ordena y mide otra vez contra el loop tal como está.
  - Volver a elegir en la lista la misma opción que ya estaba puesta (por ejemplo, Fill % otra vez) no hace nada: para recalcular, pulsa **↓ Sort**.
- **Sin copias, en cualquier orden**: cada pieza sale una vez, la que queda más arriba.
  - **Las mismas notas** (la misma canción guardada en dos archivos, dos canales que tocan lo mismo) cuentan como copia.
  - **Otras transcripciones de la misma pieza** (por ejemplo, tres Moonlight Sonata o tres versiones del mismo boogie) también, si cumplen todo esto:
    - casi todas sus notas, puestas en la misma tonalidad, coinciden con las de una parte que está más arriba: 85 % o más en cualquier sección de esa pieza, y 95 % en batería;
    - la comparación es en fragmentos de 4 compases o más, porque un compás suelto (un ritmo básico de batería, una nota de bajo) se repite en muchas canciones distintas y no cuenta;
    - las dos partes tienen un número de notas parecido (±20 %).
  - Se mira en las primeras 5.000 de la lista. Debajo de la lista, el contador dice cuántas se han quitado, por ejemplo *1.090 of 1.332 parts (242 copies left out)*.

---

## Favoritos (pestaña Favorites)

Para ir clasificando fragmentos mientras exploras y usarlos más tarde, en **colecciones** tuyas («Batería tecno», «Música celta», «Intros»…).

**Colecciones** (acordeón: cada una se abre y se cierra con ▸ / ▾ o clic en su nombre)

| Botón | Qué hace |
|---|---|
| **+ New collection** | Crea una colección (pide el nombre) |
| **▲ ▼** | La sube o la baja en la lista |
| **✎** | Cambia su nombre |
| **⤓** | Guarda **solo esa colección** como `.mdig`, para compartirla |
| **✕** | La borra (hay que pulsarlo **dos veces**: la primera pide confirmación) |

**Añadir fragmentos**

- **★** en cualquier tarjeta de **Parts**: abre la lista de colecciones; un clic mete el fragmento (✓) o lo saca. **+ New collection…** crea una y lo mete en ella.
- La ★ sale **llena** cuando el fragmento ya está en alguna colección; su tooltip dice en cuáles.
- Un fragmento puede estar en **varias colecciones**; se guarda una sola vez.
- **Compases que eliges tú en una canción:** abre la canción y selecciona los compases arrastrando sobre los números de compás (la región verde). Luego pulsa la **★** de la línea **File**, a la izquierda de 📂.
  - Se guarda **un favorito por pista**: de las pistas **marcadas** o, si no hay ninguna marcada, de todas las que tocan en esos compases.
  - Se guardan los compases **tal como los elegiste**, también si una pista entra más tarde (por ejemplo, en el segundo compás).
  - **Una fila del loop:** la **☆** junto al nombre de la fila la guarda **tal como suena** (en la tonalidad del loop, con el desplazamiento, swing y velocity de cada pad, sin los pads apagados), desde su primer pad con notas hasta el último. Sale **llena** si la fila, tal como está, ya es un favorito; si cambias sus notas, vuelve a vacía (sería otro favorito).
  - Sin región, la ★ sale apagada. Sale **llena** cuando esos compases ya están en una colección. Volver a elegir esa colección los saca.

**Usar los favoritos**

- Cada favorito muestra el icono de su familia de instrumentos, como en Summary; la batería tiene su propio icono.
- **Renombrarlo:** un clic en su nombre lo edita ahí mismo. **Enter** lo guarda (también hacer clic fuera) y **Esc** lo deja como estaba. Si lo dejas vacío, vuelve al nombre del instrumento. Al arrastrarlo al loop, la fila nueva lleva ese nombre.
- **▶**: escucharlo. Sin loop, suena solo y en bucle, a su tempo; dentro de un loop, suena **sobre el loop**, como una tarjeta de Parts.
- **Arrastrarlo** al loop: sobre un pad de una fila, o bajo las filas para un instrumento nuevo. Sobre la canción, empieza un loop nuevo con él.
- **✕** en un favorito: lo saca de esa colección.

**Encaje con el loop (%)**

- Con un loop abierto (o con 🎯 la sesión de LUNA), cada favorito muestra su **% de encaje**, con los mismos colores que las tarjetas de Parts: verde (encaja), ámbar (puede ir), rojo (choca). Se mide igual que en Parts: sus notas, ya transportadas a la tonalidad del loop, y dónde golpean frente a las del loop.
- Se recalcula solo cada vez que cambias el loop.
- **Best fit first**: dentro de cada colección pone primero los que mejor encajan.

**✨ Fill y Arrange desde una colección**

Junto a **✨ Fill** hay un desplegable **fuente**: **Library** (toda la biblioteca, como siempre) o **★ una de tus colecciones**. Con una colección:

- **Fill sin selección** añade el instrumento de la colección que mejor encaja con el loop (y que no esté ya en él).
- **Fill con pads seleccionados** reemplaza esos compases. Cada fila conserva su sonido y toma un favorito **de su mismo papel** (melodía, acordes, bajo, batería), aunque venga de otro instrumento. Por ejemplo, la frase de una flauta puede ir en la fila del piano.
- **Arrange** (los patrones de ▶) busca las alternativas solo en la colección.
- Valen favoritos de **cualquier tempo**, porque sus notas van en tiempos. Tienen que ser del **mismo compás** que el loop.
- No necesita leer ningún `.mid`: funciona sin biblioteca analizada.
- 👍 / 👎 funcionan igual. El desplegable se marca en ámbar mientras usa una colección. Si borras esa colección, vuelve a Library.

**Resultados de Fill: escuchar y elegir otra alternativa**

- Si seleccionas pads de **una sola fila** y pulsas ✨ Fill, se abre una pestaña nueva con el nombre de esa fila y sus resultados. Las pestañas anteriores del mismo loop siguen disponibles y pasan a otra línea si no caben. Cerrar una pestaña con **×** detiene su playlist y devuelve la fila a como estaba antes de ella.
- Con varias filas seleccionadas, Fill sigue mostrando los grupos juntos en una pestaña **Fill results**. Esta pestaña aparece solo cuando hay resultados agrupados, también para Fill sin selección o los botones de forma. Su **×** cierra esos resultados y detiene sus playlists, devolviendo sus filas a como estaban; las pestañas individuales siguen abiertas. Cada loop conserva sus propios resultados mientras está abierto.
- Al quitar o volver a añadir una fila del loop, la tabla abierta actualiza sus botones **☰ List / ＋ Add** sin cambiar de pestaña; las puntuaciones siguen siendo las del momento en que se ejecutó Fill.
- Si cambias el ancho del panel arrastrando el borde, los MIDI grids se ajustan al nuevo ancho.
- **What we have** (el contexto) va plegado para ahorrar sitio: un clic lo abre, y se queda abierto.
  - Dentro se ve el MIDI grid de lo que sonaba.
  - El texto de **contra qué se comparó** (Fit target, filas, largo, tempo y tonalidad, referencias de dinámica, actividad y rol, acordes y grooves, y las rejillas en texto) se abre y se cierra con la **calculadora** que hay a la derecha de esa línea, igual que en cada propuesta. Abierto o cerrado, se queda así en todos los grupos.
- Si cambias de pestaña mientras suena una propuesta con ▶, se para.
- Los **MIDI grids** caben enteros en su caja, sin scroll: todos los compases a lo ancho y, a lo alto, solo las notas que suenan.
- En **What we have** hay un MIDI grid con **las filas del loop que suenan** (las silenciadas no), cada una de un color con su nombre arriba: es con lo que se comparan las propuestas. La batería va en un grid propio debajo.

- **▶** en cualquier propuesta la escucha sola, al tempo del loop. Mientras suena, el botón cambia a **⏸**; otro clic la para. Si pulsas ▶ en otra, el ⏸ pasa a esa.
- Las propuestas van **numeradas en el orden en que las puntuó Fill** (la 1 es la mejor), y ese orden no cambia aunque metas otra en el loop.
- Se muestran **hasta 50 propuestas** por cada cosa que eligió Fill o Arrange: la elegida y 49 alternativas. Puede haber menos: Fill de instrumento nuevo propone uno por instrumento, y solo entran las que llegan al 55 %. El MIDI grid de cada propuesta se lee al acercarte a ella con el scroll, no todos a la vez.
- Los botones de cada propuesta son **solo iconos**, para que quepan en el panel: **⇣** (Replace), **✓** (In the loop) y la **calculadora** (cálculos). Pasa el ratón por encima para ver qué hace cada uno. Debajo del nombre, a la derecha, van el archivo, el papel y los compases.
- **La calculadora** (a la derecha de cada propuesta) abre y cierra **sus cálculos**: tempo, compás y tonalidad de origen, velocity y actividad, acordes y groove, el **Fill % desglosado** (Fit, Length, Dynamics, Activity, Role con sus pesos), la evidencia del Fit y las rejillas de notas y ritmo. Van plegados para que la lista sea corta; los que abras siguen abiertos aunque metas o quites propuestas.
- **⇣** (Replace) lleva esa propuesta al loop **en lugar de la que está ahora**: en los mismos compases de la misma fila o, si Fill añadió un instrumento, como ese instrumento nuevo (con su sonido y su nombre). Entra igual que si la hubiera elegido Fill: en la tonalidad del loop y con sus notas ajustadas a lo que suena.
- La que está en el loop muestra **✓** (In the loop), así que puedes ir probando una tras otra.
- **▶▶ (escuchar todas seguidas)**, en la **barra fija de arriba de la pestaña** (no se mueve con el scroll de la lista). Si hay varios grupos (tras Arrange, o Fill sobre varias filas), un desplegable a su izquierda elige de cuál son las propuestas. El loop sigue sonando y **las propuestas entran en esa fila del loop una detrás de otra, en su orden**, cada una en el momento en que acaba la anterior. Es como pulsar ⇣ justo al final de cada una, pero lo hace solo.
  - El **▶▶ a la izquierda de Play** arranca juntas las playlists disponibles de todos los resultados abiertos del loop, también los grupos de Fill results. Las que ya suenan siguen; si hay varios resultados para una misma fila, se usa el último disponible. Solo se incluyen grupos con al menos dos propuestas y filas que siguen en el loop.
  - Los pads de la fila se actualizan con las propuestas. Si se redibuja el loop durante un cambio programado, pueden mostrar la siguiente propuesta antes de que suene.
  - **Cuánto suena cada una**:
    - con Fill de instrumento nuevo, sus propios compases, empezando en el compás en que entra;
    - con pads seleccionados, una pasada por esos compases;
    - tras Arrange, una vuelta del loop.
  - Si el loop está sonando, la primera entra en el compás siguiente; si está parado, arranca.
  - La que suena se resalta en la lista, y la línea de al lado dice cuál es (*2/4 · Electric Piano 2 · heard 1*).
  - **Los cambios a mano entran en el pulso siguiente**, en menos de un segundo (a 120 BPM, como mucho medio segundo). La propuesta nueva entra cuadrada con el compás: si entra en el pulso 3, la oyes desde su pulso 3. Con instrumento nuevo suena un compás más, para que se oiga entera. El paso automático de una a otra sigue siendo al final de cada frase.
  - **Un clic en cualquier propuesta de la lista** (fuera de sus botones) mientras suena ▶▶: **entra en el pad siguiente** (el compás siguiente) y la cadena sigue desde ella, con la que va detrás en la lista. Mientras espera a entrar se marca con un borde discontinuo; al entrar se ilumina y la lista salta hasta ella.
  - **⏮ / ⏭**: la anterior o la siguiente **de la lista**.
  - **↶ / ↷**: atrás o adelante **en lo que ha sonado**, sea cual sea su sitio en la lista. Si saltas de la 5 a la 12 y no te gusta, ↶ te devuelve a la 5; ↷ vuelve a la 12.
  - **★**: marca como **estribillo** la que suena (se ilumina mientras suena; otro clic la desmarca). **↩★** vuelve al estribillo en el pulso siguiente y, al terminar, sigue con la que estabas escuchando. Así puedes explorar frases y volver al estribillo, como en una canción: verso, estribillo, verso…
  - **↻**: se queda en la que suena, una vez tras otra; otro clic sigue con la siguiente cuando acabe.
  - Al terminar la última propuesta, vuelve a la primera y sigue sonando. Cada playlist recorre sus propias propuestas independientemente de las demás.
  - **■** (el mismo botón), el ■ general, cambiar de loop o ir a Song, ↶ / ↷ del loop, o usar ⇣ la paran. Al pararla, **la fila vuelve a como estaba**: para quedarte con algo, usa ⇣ o ⤓ Save chain.
  - **Es una playlist en esa fila: sigue sonando aunque cambies de pestaña.** Puedes tener playlists independientes en varias filas a la vez: selecciona otra fila, pulsa Fill y después ▶▶ en su nueva pestaña; la playlist de drums sigue sonando mientras cambia la guitarra. Cada playlist activa tiene su propia línea de controles sobre las pestañas.
    - El indicador **▶▶ junto al nombre de la fila** señala que sus pads están cambiando con una playlist; desaparece cuando esta se detiene.
    - Si arrancas otra playlist para una fila que ya tiene una, la anterior de esa fila se detiene. ■ en la barra general del transporte detiene todas.
    - Puedes ir a Parts o Favorites, buscar instrumentos y añadirlos o quitarlos del loop mientras las filas van cambiando.
    - Encima de las pestañas aparece una **tira por playlist** con lo que suena (*▶▶ Drums: 4/28 · Drums*) y sus botones: ⏮ ⏭ ↶ ↷ ↻ ★ ↩★ ■ ⤓. Si hay muchas, desplaza verticalmente esa zona.
    - Las **demás filas** del loop las editas como siempre, y suenan con la playlist.
    - **Si editas a mano la fila de la playlist** (borrar, pegar o soltar algo en sus pads…), la playlist se para y la fila se queda con lo que tenía más tu cambio: es tuya.
    - **Parts mide Fit y Fill %** contra esa fila **como estaba antes de la playlist**, para que la lista no cambie cada pocos compases.
    - **El Undo** también guarda esa fila como estaba: ↶ nunca te devuelve un ritmo de paso.
  - **⤓ Save chain** escribe en el loop **lo que has escuchado**, en ese orden y una detrás de otra: cada propuesta escuchada hasta su final (también las repeticiones con ↻) más la que está sonando. Las que saltaste con ⏮ / ⏭ no entran.
    - Con Fill de instrumento nuevo, va en todo el loop, y **cada frase con su propio sonido**: la fila que añadió Fill toma el de la primera, y cada instrumento distinto va a una fila nueva.
    - Con Fill sobre pads seleccionados, va en esos compases de esa fila, con su sonido.
    - Lo que no cabe se corta en el último compás, y el log dice cuántas quedaron fuera. **↶** lo deshace.
    - Tras Arrange, ▶▶ sirve para escuchar, pero la cadena no se guarda: usa ⇣. **Ctrl+Z** deshace cada cambio.
- **También tras los botones de forma** (Build-up, Breakdown, Arc… y ✨ Markov): Fill details enseña **cada fragmento que cambió Arrange**, en qué compases suena y las alternativas que sopesó, con la misma puntuación que Fill. **⇣** (Replace) pone la alternativa en **todos los compases donde sonaba ese fragmento**, cada uno con su mismo trozo, y conserva las secciones, el swing, el desplazamiento y la velocity que había. Si después editas esos pads o deshaces con Ctrl+Z, vuelve a pulsar el botón de forma.
- **⇡ Loop from song** no lo usa: reordena los fragmentos de una sola canción y no elige entre alternativas de la biblioteca.

**Cómo elige Fill sus propuestas**

- **Fill % = 45 % Fit + 25 % Length + 15 % Dynamics + 5 % Activity + 10 % Role.** Si falta una medida (por ejemplo, el Fit sin **Key** en el loop), su peso se reparte entre las demás.
- **Sin repetidos**: si dos fragmentos tienen exactamente las mismas notas (la misma canción guardada en dos archivos, una parte copiada a otro instrumento), sale solo el mejor.
- **Variedad**: la mejor propuesta va siempre primero. Entre las que están casi empatadas (a menos de 3 puntos), Fill prefiere **otra familia de instrumentos** (teclado, guitarra, cuerdas, viento…); en un Fill de compases seleccionados, donde el instrumento no cambia, prefiere **otra canción**.
- **Dynamics y Activity, sin la batería**: un instrumento con notas se compara con las filas que tienen notas; una batería, con la batería. Si no hay ninguna fila de su tipo, esa medida no cuenta.
- **La velocity que se arregla con el menú Velocity no resta**: si un fragmento suena más flojo o más fuerte, pero dentro de lo que corrige el menú (×0,6 a ×1,4), no pierde puntos. Lo que cuenta es la forma de su dinámica: si es plana o expresiva como lo que suena.
- **Tus 👍 / 👎** ajustan cómo se calcula el Fit. Vota también 👎: con solo 👍, el Fit aprende que casi todo encaja. **Reset votes** (en Data) vuelve a los pesos de fábrica.

**Independientes de los archivos**

Cada favorito guarda **todo lo que necesita**: sus notas, su instrumento, tempo, compás, tonalidad, sus acordes y su huella para el encaje. Sigue funcionando aunque muevas, renombres o borres el `.mid` original, o cambies de biblioteca. Su ruta de origen se guarda solo como referencia.

**Guardar y compartir**

- Se guardan solos dentro del add-on, al momento, como los votos.
- **⤓ Save**: todos los favoritos y colecciones en **un solo archivo `.mdig`** (copia de seguridad, otro ordenador, compartir). El **MDIG Viewer** también lo abre.
- **⤒ Restore…**: añade los de un `.mdig` guardado así. Las colecciones con el mismo nombre se juntan y ningún fragmento se repite.
- Haz **⤓ Save** de vez en cuando: LUNA para Windows puede borrar el almacenamiento del add-on al reiniciarse.

---

## Loops

La barra de herramientas se distribuye en una cuadrícula que se adapta al ancho del panel. Los botones de Arrange y los controles relacionados permanecen agrupados.

### Guardar y abrir loops

- **⤓ Save loop**: antes de descargar, una ventana pide el **nombre del archivo**. Propone el de la pestaña, el tempo y la tonalidad («Loop 4 - 110 BPM - F minor»), seleccionado para escribir encima. **Enter** guarda; **Esc** o **Cancel** no guardan. Los caracteres que Windows no admite (`\ / : * ? " < > |`) se sustituyen; `.json` se añade solo.
- **⤓ MIDI**: la misma ventana pide el nombre del `.mid` antes de exportarlo. Propone el mismo nombre que Save loop, y `.mid` se añade solo. **Esc** o **Cancel** no exportan.
- **⤒ Open loop…**: abre un loop guardado en una pestaña nueva.
- **El nombre de la pestaña** es el del archivo, como en las de MIDI: sus primeros 11 caracteres, con el nombre completo al pasar el ratón. Al guardar con otro nombre, la pestaña lo toma, y la próxima vez que guardes ese loop se te propone el mismo. Los loops nuevos sin archivo se llaman «Loop 1», «Loop 2»…

### Atajos de teclado

| Teclas | Acción | Equivale a |
|---|---|---|
| **Ctrl+Z** | Deshacer el último cambio del loop | ↶ Undo |
| **Ctrl+Y** o **Ctrl+Shift+Z** | Rehacer | ↷ Redo |
| **Ctrl+C** | Copiar los pads seleccionados | ⧉ Copy |
| **Ctrl+X** | Copiar y vaciar los pads seleccionados | ✂ Cut |
| **Ctrl+V** | Pegar a partir del pad seleccionado | 📋 Paste |
| **Supr** | Vaciar los pads seleccionados | ✕ Clear |

- Solo funcionan dentro de un loop, nunca mientras escribes en un campo (tempo, búsqueda…) ni con una ventana abierta.
- Ctrl+C / X / V necesitan pads seleccionados; sin selección, el texto se copia y pega como siempre.

### Tail y push: que las frases no empiecen ni acaben en seco

Menú **Tail…** de la barra del loop. Se aplica a **toda la selección**: en cada pad vacío que viene justo después (tail) o justo antes (push) de una frase.

| Opción | Qué hace | Ejemplo |
|---|---|---|
| **◀ From left (tail)**: 1/4, 2/4, 3/4, 4/4 | La nota o acorde final del pad de la izquierda (y lo que suena debajo, como un bajo tenido) **se sostiene** dentro del pad vacío esa fracción del compás | Una frase de cuerdas que respira en vez de cortarse |
| **▶ From right (push)**: 1/8, 1/4, 2/4 | Las notas con las que **empieza** el pad de la derecha (en su primer tiempo) **entran antes**, dentro del pad vacío, y siguen al llegar a su compás | Anticipación, como en pop, funk y latin |
| **▶ en el último pad del loop** | Las primeras notas del **compás 1** entran antes, al final del loop, y suenan hasta el final; el compás 1 las vuelve a tocar | **Pickup** hacia el principio cuando el loop vuelve a empezar |
| **No tail** | Quita todos los tails y pushes de la selección | |

- **Las mismas notas, sin volver a atacarlas** (salvo el pickup, porque ninguna nota puede atravesar el punto de loop, tampoco en LUNA).
- Dos pads vacíos seguidos: el tail solo entra en el primero; nunca se encadena un tail desde otro.
- Un pad entre dos frases admite tail y push a la vez si no se solapan (por ejemplo ◀ 2/4 y ▶ 1/4); si se solaparan, avisa.
- Otra fracción sobre el mismo pad rehace el tail sin acumularse.
- No funciona en la batería, ni en pads con notas propias, ni si el pad vecino está vacío (avisa en el log).
- Un push necesita que la frase de la derecha empiece en su primer tiempo.
- No sabe de decay: en instrumentos que se apagan solos (piano, guitarra, pizzicato) se nota poco; donde se nota es en cuerdas, órganos, pads, coros y vientos.

**⌒ Legato** (en el mismo menú **Tail…**): para pads **con notas**, cuando un loop hecho de fragmentos suena «a golpes» en cada cambio de compás. Selecciona los pads (por ejemplo, toda la fila de cuerdas) y elige **⌒ Legato**. Al final de cada pad marcado:

- **Liga** la nota que llega a la raya con **la misma nota** que empieza el pad siguiente: suena una sola vez, sin volver a atacarla.
- **Cierra el hueco** si las últimas notas acaban como mucho **un tiempo** antes de la raya: se alargan **hasta la raya, nunca más allá**, así que no chocan con la armonía del compás siguiente. Un silencio más largo se respeta, porque es una pausa de la frase.
- **El ritmo de dentro del pad no cambia** (un staccato sigue staccato), y las notas guardadas en los pads tampoco: **No legato** lo deja todo como estaba, y **Ctrl+Z** también lo deshace.
- Los pads con legato llevan la marca **⌒** abajo a la derecha. Se guarda con el loop.
- No se aplica a la batería, ni del último compás al compás 1, ni hacia o desde un pad apagado.
- **⤓ MIDI** y **LUNA Export** lo llevan como suena: en LUNA, los pads que una nota ligada atraviesa van en un solo clip, para que no se corte en la raya.
- Donde más se nota es en cuerdas, pads, coros, órganos y vientos lentos. En partes rápidas y rítmicas casi no cambia nada.

### Altura y escala: Key, Mode y los botones ▼▲ / 8va

Tres formas de cambiar cómo suenan las notas de un loop. No se pisan: **Key** decide **dónde** suena todo el loop, **Mode** decide **cómo** suena una parte, y **▼▲ / 8va** la **suben o bajan** tal cual.

| | **Key** | **Mode…** | **▼ −1 / ▲ +1 · −8va / +8va** |
|---|---|---|---|
| **Dónde está** | Cabecera del loop (Tempo, Meter, **Key**, Length) | Barra de herramientas, junto a −8va / +8va | Barra de herramientas |
| **Qué cambia** | **Dónde está la tónica** del loop | **El color de la escala**, con la misma tónica | **La altura** de los pads, en semitonos u octavas |
| **Ejemplo** | Re mayor → Mi mayor | Re mayor → Re menor / dórico / blues | Re mayor → Re# mayor (+1) o una octava arriba (+8va) |
| **Cómo mueve las notas** | **Todas la misma distancia**, hasta la nueva tónica | **Solo las que el modo altera** (F# → F, B → Bb, C# → C); el resto se queda | **Todas la misma distancia** (1 o 12 semitonos) |
| **La melodía** | Idéntica, más aguda o más grave | Misma forma y ritmo, **otro carácter** | Idéntica, más aguda o más grave |
| **A qué afecta** | **Todo el loop** | **Pads seleccionados** | **Pads seleccionados** |
| **Batería** | No la toca | No la toca | No la toca |
| **Necesita** | — | Que el loop tenga **Key** | — |
| **Se acumula** | No: siempre lleva cada clip desde su tonalidad original a la del loop | No: siempre desde las notas originales | **Sí**: +1 y +1 = +2 |
| **Cómo se deshace** | Volver a la Key anterior, o ↶ Undo | **Original**, o ↶ Undo | El botón contrario, o ↶ Undo |
| **Para qué sirve** | Cuadrar el loop con tu canción o la voz | Variaciones: puente en menor, riff en dórico, aire blues | Mover una sección, doblar a la octava, ajustar un pad que choca |

**Detalles de Mode…**

- **By degree** (major, natural minor, harmonic minor, melodic minor, dorian, phrygian, lydian, mixolydian, locrian): cada nota conserva su grado y solo cambian las que el modo altera. La frase mantiene su forma.
- **Fewer notes (to the nearest)** (major pentatonic, minor pentatonic, blues): estas escalas tienen menos notas, así que cada nota va a la más cercana. La melodía puede cambiar: conviene escucharla. El log avisa.
- Las notas cromáticas (fuera de la escala del loop) no se mueven.
- El tooltip del pad indica el modo aplicado («mode natural minor»).
- La fila de acordes de arriba sigue al modo: en Sol mayor → Sol menor, «Em Bm» pasa a «Eb Bb». Cada acorde cambia como sus notas, y **Original** devuelve también los acordes.
- La fila de acordes muestra, en cada tiempo, el acorde de la primera fila con notas que lo tenga. Si cambias el modo de otra fila, esa línea puede no variar.
- Se conserva al guardar y abrir el loop: **Original** sigue funcionando.

**Un matiz de Key:** elegir «Re menor» en Key **no convierte** en menores las frases mayores; las lleva a su relativo (una frase en Do mayor pasa a Fa mayor, que comparte notas con Re menor). Para que suenen en menor, usa **Mode…**.

### Capas, half-time / double-time y groove de la batería

Botones de la barra del loop. Actúan sobre la **selección de pads**, y cada uno es un paso de Undo (Ctrl+Z).

| Botón | Qué hace | Para qué lo usan los productores | Selección | Batería |
|---|---|---|---|---|
| **⊕ Layer** | Duplica cada fila seleccionada justo debajo («… (layer)»), con los mismos pads, notas, sonido y pads apagados | **Capas**: dar a la copia otro sonido (♪) o moverla una octava (+8va / −8va). Piano + pad, bajo + sub, cuerdas en dos octavas | Las **filas** seleccionadas | No (solo puede haber una fila de batería) |
| **½×** (half-time) | Los compases seleccionados, el doble de lentos: cada nota dura el doble y está el doble de separada; la primera mitad llena la selección | **Breakdowns**: la misma parte con la sensación de ir a medio tiempo | Filas y compases seleccionados | Sí |
| **2×** (double-time) | Los compases seleccionados, el doble de rápidos, tocados dos veces para llenar la selección | **Subidas, fills**, más energía con el mismo material | Filas y compases seleccionados | Sí |
| **🥁 Lock** (lock to drums) | Cada nota que empieza a menos de una semicorchea de un golpe de batería se mueve a ese golpe, sin cambiar su duración | Que el bajo y los teclados **toquen con la batería**: copian su groove, sus empujes y su swing | Filas y compases seleccionados | Es la guía: no se mueve |

**Detalles**

- La selección **mantiene su longitud** con ½× y 2×. Aplicar ½× y después 2× devuelve el ritmo original.
- ½×, 2× y Lock reescriben la parte de la selección como **un solo clip** por fila, con el swing y la velocity aplicados a las notas, y en la tonalidad del loop (Key sigue funcionando).
- La fila de acordes se estira o comprime igual que las notas.
- **Lock** necesita una fila de batería que suene en esos compases; si no, lo avisa en el log. Las notas lejos de cualquier golpe (más de una semicorchea) no se mueven.
- Una capa nueva aparece sin Mute, Solo ni candado, y ocupa su propio canal MIDI (máximo 15 filas).

---

## El sonido de cada fila (♪ Choose row sound)

### Elegir el sonido

Botón **♪** en la cabecera de cada fila del loop.

- **Source**:
  - **Default Sound setting**: el sonido general del programa (menú Sound de arriba).
  - **SoundFont preset**: un preset del SoundFont cargado, con búsqueda y filtro por familia GM.
  - **LUNA instrument track**: una pista de instrumento de tu sesión de LUNA.
- **Al abrir la ventana con el loop sonando, el loop se pausa**, para que oigas el instrumento sin interferencias. **Al cerrarla, sigue desde donde estaba**: con **Apply**, ya con el sonido nuevo; con **Cancel** o **Esc**, con el que tenía.
- **Apply** cambia el sonido de la fila (un paso de Undo). **Cancel** no cambia nada.
- Cambiar entre presets del mismo SoundFont mientras el loop suena no lo reinicia: el canal cambia de preset al momento.
- **Vel** (arriba a la derecha): la fuerza de las notas de prueba, de 1 a 127. Afecta a todo lo que suena en la ventana (pads, teclado del ordenador, botones ▶ y Midigrid). Sirve para oír el instrumento suave o fuerte y sus capas de velocidad. No cambia nada del loop.
- Las notas de prueba suenan por un canal propio: nunca cambian la fila hasta que pulsas Apply.
- Las pistas de LUNA todavía no se pueden probar en esta ventana (avisa).

### Pestaña Midigrid

Se abre **por defecto**. Muestra las **notas de la fila** tal como suenan en el loop (con sus compases, transposición y pads apagados), en los colores de octava, y las toca con el sonido **seleccionado en la lista**, aunque no hayas pulsado Apply.

| Acción | Cómo |
|---|---|
| Reproducir / parar | **▶ / ■**, o la **barra espaciadora** |
| Línea roja | Va sincronizada con lo que se oye |
| Mover la línea | **Clic** en el midigrid (si suena, sigue desde ahí) |
| Repetir un fragmento | **Arrastrar** para seleccionar compases (ajustado a tiempos): se repite en bucle |
| Todos los compases | **All bars** o **doble clic** |
| Una vez o en bucle | Casilla **Loop** |

- Si cambias de instrumento mientras suena, **sigue desde donde iba** con el sonido nuevo, conservando la selección.

### Pestaña Piano

Todas las notas del instrumento, **una fila por octava** (12 notas cada una), con los **mismos colores de octava** que los midigrids (C0 rojo, C1 naranja, C2 amarillo, C3 verde, C4 cian, C5 azul, C6 violeta, C7 morado, C8 rosa; batería ámbar). En una batería, un pad por sonido del kit con su nombre GM.

**Botones** (primera línea):

| Botón | Qué toca |
|---|---|
| **▶ Octaves** | La tónica en todas las octavas, de grave a agudo: cómo cambia el timbre según la octava |
| **▶ Scale** | Las notas de la escala dentro de la **octava elegida** (clic en su etiqueta, C3…), subiendo y bajando |
| **▶ Full range** | La escala por todo el rango del instrumento |
| **▶ Row** | La parte de la fila sola, con el sonido elegido |
| **▶ Kit** (batería) | Cada sonido del kit |
| **■** | Parar |

- Si cambias de instrumento mientras suena un ▶, la frase **vuelve a empezar desde la primera nota** con el sonido nuevo.
- A la derecha de los botones, la **escala**: tónica y tipo (mayor, menor natural, armónica, melódica, modos, pentatónicas, blues). Al abrir la ventana es la tonalidad del loop. Debajo, en blanco, su nombre y sus notas («**G major**: G A B C D E F#»).

**Marcas en las teclas**

| Marca | Significado |
|---|---|
| Franja y nombre en el color de la octava | Nota de la escala elegida |
| Franja más gruesa y borde | Tónica |
| Tecla atenuada, sin nombre | Nota fuera de la escala |
| **Rellena** del color de su octava | La fila toca esa nota |
| Rellena con **borde rojo** y nombre | La fila toca esa nota y **no es de la escala** (un acorde prestado, una nota de paso); también se listan abajo |
| Gris | El preset no tiene muestra en esa tecla |
| Recuadro de la octava | Octavas donde toca la fila |
| Más viva con borde blanco | Nota sonando |

- Cada escala usa 7 de las 12 notas: siempre hay teclas fuera. Re mayor, por ejemplo, tiene 2 alteraciones (F#, C#); las otras 3 teclas negras quedan atenuadas.
- **Rango**: por defecto, el habitual de la familia del instrumento (bajo E1–G4, guitarra E2–E6, piano A0–C8…), siempre con el registro de la fila. **All keys** muestra todas las teclas con muestra.
- **Tocar**: clic en un pad (arrastrando, recorres notas), o el teclado del ordenador **Z–M** y **Q–U** (dos octavas desde la octava elegida).
