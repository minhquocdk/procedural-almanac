# Truyện tranh pixel: kịch bản do AI viết, engine của almanac vẽ

Một file JSON mô tả truyện (dàn nhân vật, các cảnh, lời kể, thời tiết) được engine vẽ thành phim pixel động: **không
sprite, không ảnh, không build step**, chỉ có almanac. Cùng một file cho ra cùng một phim ở trình duyệt và ở Node.

- `story.js` — engine: `validate(script)` (câu lỗi chỉ đúng chỗ) và `storybook(script, { seed, size, fps })` trả về
  `frame(f)`, một hàm thuần của số khung: tua được, lặp được, đặt làm wallpaper được, render offline được.
- `index.html` — player: timeline, chế độ **wallpaper** (chỉ còn hình, tự lặp, chữ kể chuyện tự ẩn), ô dán kịch bản
  để xem ngay.
- `format.md` — **định dạng kịch bản**: đưa file này cho mô hình ngôn ngữ khi muốn nó viết truyện mới.
- `film.mjs` — chụp ảnh/kiểm tra trong Node: `--check`, `--still`, `--sheet`.
- `stories/` — ba truyện mẫu tiếng Việt: `ba-chu-heo.json`, `vit-con-tim-me.json`, `lac-long-quan-au-co.json` (rồng
  bay, tiên có cánh, tổ trăm trứng, thuyền ra khơi).

## Chạy

```sh
python3 -m http.server 8000          # rồi mở http://localhost:8000/examples/storybook/
```

Trong player:

- **Space** chạy/tạm dừng, **◀ ▶** lùi/tiến một giây, **W** bật/tắt wallpaper, **Esc** thoát wallpaper.
- **Đổi kể**: cùng kịch bản, hạt giống khác (gen khác, cây khác, mưa khác).
- **480 / 640 / 960 px**: cùng bố cục, khung hình lớn hơn (mọi kích thước trong kịch bản tính theo bề ngang 480).
- Ô **dán kịch bản**: dán JSON do AI viết, bấm *Vẽ truyện này*; nếu sai, danh sách lỗi hiện ngay dưới, chỉ đúng khoá.

Trong Node:

```sh
node examples/storybook/film.mjs --check                              # kịch bản có vẽ được không, và dùng bao nhiêu kỹ thuật
node examples/storybook/film.mjs --sheet sheet.png --at 3,12,30,55    # vài khoảnh khắc trên một tờ ảnh
node examples/storybook/film.mjs --still 12 vit.png                   # một khung hình
node examples/storybook/film.mjs --story stories/vit-con-tim-me.json --size 960 --seed khac
```

## Đo trên máy này

| khung hình | truyện ba chú heo | truyện vịt con (có nước) |
| ---------- | ----------------- | ------------------------ |
| 480×270    | 3.9 ms/khung      | 5.1 ms/khung             |
| 960×540    | 5.5 ms/khung      | 10.9 ms/khung            |
| 1280×720   | 11.6 ms/khung     | 19.5 ms/khung            |

Ở 20 khung/giây, 960×540 còn thừa hơn 4× (mỗi khung chỉ cần 50 ms). Engine vẽ đúng khung được hỏi, không cần chạy
tuần tự, nên đặt ở tab nền hay máy ngủ rồi quay lại vẫn đúng cảnh.

## Đóng gói thành live wallpaper

Engine chỉ là một hàm thuần: `frame(f)` → `Uint32Array` (đúng dạng `ImageData`). Vì vậy cùng một truyện chạy được ở
mấy nơi:

| nền tảng                | cách làm                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| Trình duyệt / TV box    | chính `index.html` này, bấm **Wallpaper** (fullscreen, ẩn thanh điều khiển, chữ kể tự ẩn sau 3.2 s)          |
| Windows (Wallpaper Engine, Lively) | trỏ tới `index.html?story=…` như một web wallpaper, hoặc render sẵn MP4 loop bằng `film.mjs` rồi dùng video wallpaper |
| macOS / Linux (Plash, ScreenPlay) | cùng một URL; hoặc một cửa sổ kiosk luôn nổi dưới desktop                                   |
| Android                 | một `WallpaperService` bọc WebView trỏ tới player; hoặc gọi `book.frame()` trong native loop                  |
| iOS / máy tính bảng     | chế độ kiosk (Guided Access) với player này; iOS không cho app vẽ ra sau home screen                         |
| Electron / Tauri        | một cửa sổ borderless `alwaysOnTop: false`, `skipTaskbar`, `setIgnoreMouseEvents` khi rê chuột ra ngoài      |

Ba điều cần giữ khi đóng gói:

1. **Đừng chạy theo `requestAnimationFrame` khi bị ẩn** — engine không cần, nhưng pin thì cần: dừng `tick` khi
   `document.hidden`, và khi hiện lại thì đặt `frame` theo đồng hồ thật (`book.sceneAt` cho biết đang ở cảnh nào).
2. **`prefers-reduced-motion`**: player này tự tạm dừng nếu người dùng đã bật giảm chuyển động — giữ nguyên như vậy.
3. **Chữ kể chuyện**: với wallpaper nên để `caption` mờ dần sau vài giây (player đã làm), hoặc bỏ hẳn bằng cách
   không đặt `caption` trong cảnh — hình vẫn kể được.

## Cho AI viết truyện mới

1. Đưa mô hình nội dung của `format.md` (và một file trong `stories/` làm ví dụ).
2. Nhận về JSON, dán vào ô trong player.
3. `validate()` sẽ nói chính xác chỗ sai (`cast.soi.kind: "dragon" is not a kind of animal (pig, wolf, fox, mouse,
   bird, kid)`), nên vòng sửa rất ngắn: dán lại là xong.

Muốn thêm loài mới (gấu, cá, hươu) thì thêm một mục vào `KINDS` trong `story.js`: một bảng số đo (thân, chân, đầu,
mõm, tai, đuôi, dáng đi) và khoảng gen; phần vẽ dùng chung, không phải viết lại. Loài **bay** (như `dragon`, `fairy`)
cần hình riêng: chúng không bước chân mà đập cánh theo đồng hồ.

## Những gì engine vẽ

Bầu trời theo giờ (`dayCycle`), đồi nhiều lớp có phối cảnh khí quyển và parallax (`hillLine`, `parallax`), cỏ, nước
(`waterTime`, `waterPixel`), mây, mưa/tuyết/cánh hoa/đom đóm (`particleField`, `fall`, `hover`), sương (`fogBanks`),
sét (`lightningFlash`), và một bảng màu giờ giấc phủ lên tất cả (`hourLight`, `hourTables`, `gradeFrame`) với đèn cửa
sổ và đom đóm giữ lại vùng sáng. Nhân vật là cùng một hình tham số hoá: gen quyết định cỡ, màu lông, chân; bước chân
theo quãng đường đã đi (`footStep`, `strideRate`, `gaitTiming`) nên không trượt.
