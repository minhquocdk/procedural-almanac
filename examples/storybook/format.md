# Truyện tranh pixel: định dạng kịch bản

Một truyện là **một file JSON**. Engine (`story.js`) đọc nó và vẽ ra phim pixel: không sprite, không ảnh, không
build step. Cùng một file cho ra cùng một phim, ở trình duyệt (`index.html`) và ở Node (`film.mjs`).

Tài liệu này là thứ đưa cho một mô hình ngôn ngữ (hoặc người) để viết kịch bản: mọi khoá ở đây đều được kiểm tra, và
một khoá sai bị từ chối bằng một câu chỉ đúng chỗ sai (`validate()`), không phải bằng một stack trace.

```json
{
  "title": "Ba chú heo con",
  "seed": "ba-chu-heo-2024",
  "size": 480,
  "fps": 20,
  "cast": { "heo": { "kind": "pig", "genes": { "size": 32, "coat": "#eda6a6" } } },
  "scenes": [
    {
      "duration": 9,
      "time": 0.42,
      "caption": { "text": "Ba chú heo con rời nhà.", "sub": "Mẹ dặn: con nào chăm chỉ, con ấy có nhà vững." },
      "actors": [{ "who": "heo", "size": 32, "at": [{ "t": 0, "x": -20 }, { "t": 9, "x": 170 }] }],
      "props": [{ "kind": "house", "style": "straw", "x": 250, "size": 62 }]
    }
  ]
}
```

## Gốc

| khoá    | bắt buộc | nghĩa                                                                                     |
| ------- | -------- | ----------------------------------------------------------------------------------------- |
| `title` | có       | tên truyện, hiện ở tiêu đề và trong báo cáo                                               |
| `seed`  | không    | chuỗi hạt giống: đổi nó thì cùng kịch bản ra một lần kể khác (gen, cây, mây, hạt mưa khác) |
| `size`  | không    | chiều ngang khung hình, pixel (mặc định 480; cao = 9/16 ngang: 480×270, 960×540)           |
| `fps`   | không    | khung hình mỗi giây (mặc định 20; 12 cho mềm, 20 cho mượt)                                |
| `lang`  | không    | chỉ để ghi nhớ, engine không đọc                                                          |
| `cast`  | không    | dàn nhân vật (xem dưới)                                                                   |
| `scenes`| có       | danh sách cảnh, theo thứ tự; mỗi cảnh dài `duration` giây                                 |
| `palette` | không  | ghi đè bảng màu (xem dưới)                                                                |

## Dàn nhân vật: `cast`

Mỗi nhân vật là một tên (dùng lại ở `actors`) và một loài. Loài quyết định dáng; `genes` quyết định cá thể.

```json
"cast": {
  "heo-cam": { "kind": "pig", "genes": { "size": 32, "coat": "#eda6a6", "legs": 3.4 } }
}
```

| loài (`kind`) | dáng                    | dùng cho                                   |
| ------------- | ----------------------- | ------------------------------------------ |
| `pig`         | bốn chân, tai cụp, đuôi xoăn | heo, lợn con                          |
| `wolf`        | bốn chân, tai nhọn, đuôi rậm | sói, chó                              |
| `fox`         | bốn chân, mõm dài       | cáo, mèo, chó nhỏ                          |
| `mouse`       | bốn chân, tai tròn, nhỏ | chuột, thỏ con, nhím                       |
| `bird`        | hai chân, mỏ, cánh, đuôi lông | vịt, gà, chim                      |
| `kid`         | hai chân, tóc           | em bé, bạn nhỏ                             |
| `dragon`      | bay: mình rắn dài uốn lượn, đầu có sừng và râu, vây lưng, bốn chân móng, đuôi quạt | rồng, thủy quái |
| `fairy`       | bay: váy dài, tóc dài, hai cánh bướm đập theo nhịp | tiên, nàng tiên, thần nhỏ |

`genes` (tất cả không bắt buộc):

| gene   | kiểu   | nghĩa                                                    |
| ------ | ------ | -------------------------------------------------------- |
| `size` | số     | cao của con vật trong khung hình, pixel (heo 30–38)      |
| `coat` | `#rrggbb` | màu lông (với `fairy`: màu váy); phần tối/sáng/viền suy ra từ nó |
| `legs` | số     | dài chân (đơn vị thân)                                    |
| `body` | số     | thân dài/nở ra bao nhiêu (dragon: 0.85–1.3)               |
| `skin` | `#rrggbb` | màu da (fairy)                                         |
| `hair` | `#rrggbb` | màu tóc (fairy)                                        |
| `wing` | `#rrggbb` | màu cánh (fairy)                                       |

`dragon` và `fairy` **bay**: chân không bước mà thân/cánh đập theo đồng hồ, và chúng luôn được vẽ sau cùng, nằm trên
mặt đất. Con rồng dài theo tỉ lệ: `size` là chiều cao của cả hình, muốn rồng dài hơn thì tăng `body`.

Bỏ trống `genes` thì engine rút gen từ hạt giống (`genomeFrom`) trong khoảng của loài: mỗi lần `seed` khác là một cá
thể khác, cùng `seed` là y nguyên.

## Cảnh: `scenes[]`

| khoá      | bắt buộc | nghĩa                                                                                     |
| --------- | -------- | ----------------------------------------------------------------------------------------- |
| `duration`| có       | cảnh dài bao nhiêu giây (> 0); 6–12 s là nhịp kể dễ chịu cho trẻ                            |
| `id`      | không    | tên cảnh, dùng trong báo cáo                                                              |
| `caption` | không    | `{ "text": "…", "sub": "…" }`: chữ trên màn hình. `text` to, `sub` nhỏ hơn, dưới nó       |
| `time`    | không    | giờ trong ngày, 0..1: 0 nửa đêm, 0.25 bình minh, 0.5 trưa, 0.75 hoàng hôn                 |
| `ground`  | không    | đường chân trời, phần chiều cao (mặc định 0.78); nhỏ hơn = nhiều trời hơn                  |
| `water`   | không    | `true`: phần dưới `ground` là nước (sóng, bọt, cát, rêu) thay cho cỏ                      |
| `beach`   | không    | với `water`: `false` để bờ là vách đá, không có bọt sóng                                  |
| `weather` | không    | `{ "kind": "clear" \| "rain" \| "snow" \| "storm" \| "fog", "strength": 0..1 }`            |
| `hills`   | không    | các lớp đồi sau lưng cảnh, xa → gần (xem dưới)                                            |
| `props`   | không    | đồ vật đứng trên nền (xem dưới)                                                           |
| `actors`  | không    | nhân vật đi lại (xem dưới)                                                                |
| `effects` | không    | hạt và sương (xem dưới)                                                                   |
| `camera`  | không    | đường đi của máy quay: `[{ "t": 0, "x": -30, "zoom": 1 }, …]`, `t` tính bằng giây trong cảnh |
| `view`    | không    | `"side"` (mặc định: nhìn ngang) hoặc `"island"` (nhìn từ trên xuống, xem dưới)             |
| `island`  | không    | với `view: "island"`: cách dựng bản đồ — `tiles`, `land`, `levels`, `lift`, `cell`, `cool`…  |

### `hills[]`: lớp đồi

```json
{ "seed": 31, "depth": 0.25, "amp": 0.42, "freq": 1.6, "sharp": 0.5, "colour": "#8fb79a" }
```

| khoá    | nghĩa                                                                       |
| ------- | --------------------------------------------------------------------------- |
| `seed`  | hình dáng dãy đồi (số nguyên)                                                |
| `depth` | 0 = xa (mờ, trôi chậm khi máy quay chạy), 1 = gần (rõ, trôi nhanh)          |
| `amp`   | đồi cao bao nhiêu, phần chiều cao khung (0.3–0.5 là đồi rõ)                  |
| `freq`  | bao nhiêu dãy đồi ngang khung (1.2–2 thưa, 4–6 lăn tăn)                      |
| `sharp` | 0 tròn, 1 nhọn (núi)                                                         |
| `base`  | chân đồi, phần chiều cao (mặc định bằng `ground` của cảnh)                   |
| `colour`| ghi đè màu lớp này                                                          |

Không có `hills` thì engine vẽ ba lớp mặc định.

### `props[]`: đồ vật

| `kind`  | thêm                                                          | dùng cho                       |
| ------- | ------------------------------------------------------------- | ------------------------------ |
| `tree`  | `size` (cao, px)                                              | cây, rừng                      |
| `bush`  | `size`                                                        | bụi cây                        |
| `rock`  | `size`                                                        | đá, tảng                       |
| `flower`| `size`                                                        | hoa                            |
| `cloud` | `size`, `y` (phần chiều cao, mặc định 0.18), `speed` (px/s trôi) | mây trên trời               |
| `house` | `style`: `straw` \| `wood` \| `stone`, `size` (ngang, px)     | nhà rơm, nhà gỗ, nhà đá        |
| `palm`  | `size`                                                        | dừa, cọ (nghiêng ra phía biển) |
| `boat`  | `size`                                                        | thuyền buồm                    |
| `nest`  | `size`, `eggs` (số trứng, 1–24), `egg` (`#rrggbb`)             | tổ trứng                       |
| `turtle`| `size`, `colour` (`#rrggbb`, màu mai)                         | rùa vàng, rùa thần             |
| `sword` | `size`, `colour` (`#rrggbb`, màu thép)                        | gươm dựng đứng (cắm xuống nước, trên đất) |
| `islet` | `size`                                                        | cồn nhỏ có tháp canh           |

Trường chung: `x` (pixel trong khung, 0 = mép trái; âm và lớn hơn `size` vẫn được), `y` (phần chiều cao, mặc định
bằng `ground`), `lift` (nhấc lên thêm, px), `seed` (đổi dáng cây/đá), `flip` (lật ngang), `sway` (cây nghiêng theo
gió, px).

`x` của props **không** đi theo máy quay: đó là toạ độ trong khung. Muốn một vật cố định trong thế giới thì đặt nó
trong cảnh có máy quay đứng yên, hoặc tính `x` theo `camera` bạn muốn.

### `actors[]`: nhân vật đi lại

```json
{ "who": "heo-cam", "size": 32, "lane": 0, "at": [{ "t": 0, "x": -20 }, { "t": 9, "x": 170 }] }
```

| khoá  | nghĩa                                                                                    |
| ----- | ---------------------------------------------------------------------------------------- |
| `who` | tên trong `cast` (bắt buộc; sai tên là lỗi ngay)                                          |
| `at`  | đường đi: các mốc `{ "t": giây, "x": pixel }`, `t` phải tăng dần; đi từ trái sang phải thì quay mặt phải, ngược lại quay mặt trái |
| `lane`| nâng lên (px, âm = xuống) để xếp lớp: ai `lane` lớn hơn thì đứng sau                        |
| `size`| cao (px); mặc định gen của loài                                             |
| `layer` | thứ tự giữa những thứ **bay** với nhau: số lớn hơn thì ở trên (mặc định 0)                |
| `hover` | bay lên xuống bao nhiêu px (nhịp riêng, nhẹ)                                             |
| `glow`  | quầng sáng quanh nhân vật, bán kính px (đom đóm, tiên, rồng lửa)                          |
| `crowd` | số bản sao của cùng nhân vật, đi cạnh nhau (tối đa 24): một trăm đứa trẻ là `crowd: 9`     |
| `spread`| khoảng cách giữa các bản sao trong `crowd`, px (mặc định 14)                              |
| `coats` | danh sách `#rrggbb`: các bản sao trong `crowd` mặc màu lần lượt                            |

Chân bước theo **quãng đường đã đi** (`strideRate`), không theo đồng hồ: đi nhanh thì bước mau, đứng yên thì đứng yên
— không trượt chân.

Nhân vật và props được vẽ xen theo `y` rồi theo `x`, nên ai ở dưới thấp (gần) thì che người ở trên (xa).

### `effects[]`: hạt, sương

| `kind`       | thêm             | hình ảnh                          |
| ------------ | ---------------- | --------------------------------- |
| `rain`       | `count`          | mưa xiên                          |
| `snow`       | `count`          | tuyết rơi chậm, đung đưa          |
| `petals`     | `count`, `colour`| cánh hoa rơi                      |
| `leaves`     | `count`, `colour`| lá bay theo gió                   |
| `dust`       | `count`          | bụi lơ lửng                       |
| `fireflies`  | `count`          | đom đóm nhấp nháy (có quầng sáng) |
| `fog`        | `density`        | sương mù cuộn                     |
| `lightning`  | —                | sét (dùng chung với `weather.kind: "storm"`) |
| `bubbles`    | `count`          | bong bóng nước nổi lên            |
| `sparks`     | `count`, `colour`| đốm sáng bay lên (trứng nở, phép thuật) |

`weather: { "kind": "rain" }` tự thêm mưa; `"storm"` thêm mưa to + sét + gió; `"snow"` thêm tuyết; `"fog"` thêm sương.

## Góc nhìn từ trên: `view: "island"`

Cùng một kịch bản có thể kể theo hai cách nhìn. `view: "side"` (mặc định) là nhìn ngang như sân khấu; `view:
"island"` là nhìn từ trên xuống: một bản đồ ô vuông, đất chia thành nhiều bậc thang cao dần từ mặt nước, người và vật
đặt lên từng ô và được vẽ từ xa tới gần. Trời, mây, mưa, đom đóm, giờ trong ngày và **mọi sprite** là của chung — chỉ
có mặt đất là vẽ khác đi.

```json
{ "id": "ho-guom", "view": "island", "duration": 10, "time": 0.9,
  "island": { "tiles": 96, "land": 0.42, "invert": true },
  "props": [ { "kind": "islet", "x": 56, "y": 48, "size": 48 } ],
  "actors": [ { "who": "le-loi", "at": [ { "t": 0, "x": 40, "y": 54 }, { "t": 10, "x": 46, "y": 54 } ] } ],
  "camera": [ { "t": 0, "x": 48, "y": 46, "zoom": 1.1 } ] }
```

### `island`: tấm bản đồ

| khoá     | mặc định | nghĩa                                                                      |
| -------- | -------- | -------------------------------------------------------------------------- |
| `tiles`  | 104      | bản đồ rộng bao nhiêu ô (24–220); bản đồ vuông nên cũng cao bằng ấy         |
| `land`   | 0.34     | phần bản đồ là đất (0.08–0.92): nhỏ = đảo nhỏ giữa biển, lớn = bờ bao quanh |
| `invert` | `false`  | `true` để **đất ở ngoài, nước ở giữa** — một cái hồ, không phải hòn đảo     |
| `levels` | 5        | số bậc thang từ mặt nước lên tới đỉnh (2–9)                                 |
| `lift`   | 4        | mỗi bậc cao hơn bậc trước bao nhiêu px (ở khung 480 rộng)                   |
| `cell`   | 6        | một ô rộng bao nhiêu px; nhỏ = thấy nhiều bản đồ hơn, vật nhỏ hơn           |
| `cool`   | 0.72     | chiều sâu một hàng bị ép lại bao nhiêu (nhỏ = nhìn nghiêng hơn)             |
| `shear`  | 0.45     | hàng phía trước lệch ngang bao nhiêu — độ nghiêng của phép chiếu            |
| `long`   | `false`  | `true`: đảo dài theo chiều ngang, như một doi đất                            |
| `seed`   | 9        | hình dáng đảo/hồ (số nguyên)                                                |
| `rough`  | 0.55     | độ gồ ghề của đường bờ (0–1)                                                |

Bản đồ dựng một lần cho cảnh và được nhớ lại: hai cảnh cùng `island` (và cùng `seed`) là cùng một hòn đảo.

### Toạ độ trong góc nhìn này

Mọi thứ đổi sang **ô** (tile) chứ không còn là pixel trong khung:

- `props[].x`, `props[].y`: ô của vật; `y` **bắt buộc**. `size` vẫn là pixel như cũ.
- `actors[].at`: `{ "t": giây, "x": ô, "y": ô }` — `y` không bắt buộc, thiếu thì đi theo hàng 0. `spread` của
  `crowd` tính bằng ô (mặc định 1.1), `lane` vẫn là px nhấc lên (đặt người ngồi trong thuyền: `lane: -4`).
- `camera[].x`, `camera[].y`: ô máy quay nhìn vào; `zoom` phóng to/nhỏ bản đồ. Không có `camera` thì máy quay mở
  đúng giữa vùng đất (hoặc giữa hồ, với `invert`).
- Thứ tự vẽ: theo hàng `y` từ xa tới gần, nên vật ở hàng lớn hơn (gần hơn) che vật ở hàng nhỏ hơn.

`hills`, `ground`, `water`, `beach` không dùng trong góc nhìn này (đã có bản đồ), và prop `cloud` không được vẽ.
`weather` và `effects` thì dùng như thường.

Bản đồ là phần **duy nhất** của truyện không đổi theo `seed` của phim: cùng một kịch bản, `seed` khác thì cỏ cây, con
vật và từng ô đất vẫn vậy, vì các ô trong kịch bản phải giữ đúng mặt đất của chúng. Muốn một hòn đảo khác thì đổi
`island.seed`.

## Bảng màu: `palette`

Mọi khoá đều không bắt buộc; thiếu thì lấy mặc định của engine.

| khoá                                                        | nghĩa                                    |
| ----------------------------------------------------------- | ---------------------------------------- |
| `sky` = `{ night, dawn, day, dusk }`, mỗi cái `["#top", "#horizon"]` | màu trời bốn thời điểm           |
| `hill` = `["#rrggbb", …]`                                   | màu các lớp đồi, xa → gần                |
| `ground`, `groundDark`                                      | cỏ                                       |
| `sea`, `sand`                                               | nước và cát                              |
| `leaf`, `bark`, `bloom`                                     | cây                                      |
| `ink`                                                       | màu viền của mọi hình                    |
| `straw`, `strawRoof`, `wood`, `woodRoof`, `stone`, `stoneRoof`, `window` | nhà                |
| `cloud`, `sun`, `moon`, `star`, `petal`                     | trời và hạt                              |

## Quy tắc để một kịch bản "chạy được"

`validate()` từ chối, kèm câu chỉ chỗ:

- `cast.<tên>.kind` không nằm trong tám loài trên;
- `actors[].who` không có trong `cast`;
- `at` rỗng, thiếu `x`, hoặc `t` không tăng dần;
- `duration` ≤ 0; `time` ngoài 0..1; `ground` ngoài 0.15..0.98;
- `props[].kind` lạ, `house.style` lạ, prop thiếu `x`;
- `view` không phải `side`/`island`; prop trong góc nhìn island thiếu `y`; `island` có khoá lạ về kiểu hay ngoài
  khoảng (ví dụ `tiles: 4`); `camera` thiếu `t`;
- `effects[].kind`, `weather.kind` lạ;
- `palette` không phải màu `#rrggbb` (trừ `sky` và `hill`).

## Mẹo kể chuyện cho trẻ

- **Một cảnh một ý.** 6–12 giây, một câu `text` (dưới 90 ký tự) và một câu `sub` (dưới 110).
- **Đổi thời gian trong ngày để đổi giọng:** `time` 0.2 = sáng trong, 0.5 = trưa, 0.72 = hoàng hôn, 0.85 = đêm.
- **Để nhân vật đi qua khung:** `x` từ âm (ngoài mép trái) đến lớn hơn chiều ngang (ngoài mép phải) trong đúng
  `duration`, tốc độ 25–45 px/s là vừa mắt.
- **Xếp lớp bằng `lane`:** người đi trước (`lane: 6`) che người đi sau (`lane: 0`).
- **Đừng kể bằng lời những gì đã thấy:** "trời mưa" thì cho `weather`, đừng chỉ viết.
- **Kết bằng một cảnh lặng:** máy quay đứng yên, đom đóm, câu kết ngắn.
- **Góc nhìn island để kể chuyện "cả một vùng":** một hồ, một đảo, một làng. Máy quay `zoom` 1.2–1.6 cho cảnh gần
  (một bờ hồ, một đám đông), `zoom` 1 cho toàn cảnh. Vật đứng trên nước thì đặt đúng ô nước (thuyền, rùa, gươm cắm
  xuống hồ); người ngồi trong thuyền thì cùng ô với thuyền và `lane: -4`.

## Chạy thử

```sh
# trong trình duyệt: player, có chế độ live wallpaper và ô dán kịch bản
python3 -m http.server 8000     # rồi mở http://localhost:8000/examples/storybook/

# trong Node: kiểm tra một kịch bản, hoặc chụp các khoảnh khắc thành một tờ ảnh
node examples/storybook/film.mjs --check
node examples/storybook/film.mjs --sheet sheet.png --at 3,12,30,55
node examples/storybook/film.mjs --story stories/vit-con-tim-me.json --still 12 vit.png
node examples/storybook/film.mjs --story stories/lac-long-quan-au-co.json --still 24 rong.png
```

## Bốn truyện mẫu

| file | truyện | có gì |
| ---- | ------ | ----- |
| `stories/ba-chu-heo.json` | Ba chú heo con | nhà rơm/gỗ/đá, sói, bão, sét, mưa |
| `stories/vit-con-tim-me.json` | Vịt con tìm mẹ | mặt hồ, sương, đêm, đom đóm, mưa |
| `stories/lac-long-quan-au-co.json` | Lạc Long Quân · Âu Cơ | rồng bay, tiên có cánh và quầng sáng, tổ trăm trứng, thuyền, dừa, đám đông trẻ, bong bóng, đốm sáng |
| `stories/su-tich-ho-guom.json` | Sự tích Hồ Gươm | **góc nhìn island**: hồ giữa kinh thành, cồn nhỏ có tháp, rùa vàng, gươm thần, thuyền, đám đông, đêm có đom đóm |
