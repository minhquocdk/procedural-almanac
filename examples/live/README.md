# Live wallpaper: bốn cảnh Việt Nam, vẽ sống bằng almanac

Bốn cảnh **đóng hộp** — không kịch bản, không ô nhập liệu, không sprite hay file ảnh — mỗi cảnh là một vòng lặp
60 giây liền mạch, sinh ra từ hạt giống của nó và vẽ bằng chính các kỹ thuật của almanac:

| cảnh | `?scene=` | có gì chuyển động |
| --- | --- | --- |
| **Hạ Long · Bình minh** | `ha-long` | mặt trời lên sau núi đá vôi, hai thuyền buồm cánh dơi, đường nắng trên mặt vịnh, sương ở chân núi, chim chữ V |
| **Ruộng bậc thang · Mùa nước đổ** | `ruong-bac-thang` | nước gương từng bậc với thác nhỏ đổ xuống, bóng mây đi qua, người dắt trâu dọc bờ ruộng, nhà sàn |
| **Hội An · Đêm đèn lồng** | `hoi-an` | dãy phố vàng lên đèn (`windowLit`), dây đèn lồng, hoa đăng trôi, thuyền qua sông, trăng sao, phố soi bóng xuống nước |
| **Rừng tre · Mưa chiều** | `rung-tre` | mưa tới từng đợt (`frontStrength`), tre lay theo cụm, suối và vũng nước gợn vòng mưa, một con cò trắng cúi bắt mồi |

- `scenes.js` — engine: `live(id, phrase, { size })` trả về `frame(f)`, một hàm **thuần của số khung**: tua được,
  lặp khít được (khung 0 và khung 1200 giống hệt nhau), tab bị ẩn rồi hiện lại vẫn đúng cảnh. Cùng một hạt giống
  cho bốn bố cục khác nhau ở bốn cảnh (hạt giống được trộn với tên cảnh).
- `index.html` — player: chọn cảnh, đổi hạt giống, tốc độ 0.5×/1×/2×, cỡ 480/960 px, chế độ **wallpaper**
  (toàn màn hình, chỉ còn hình) và **đồng hồ** phủ lên cảnh.
- `live.mjs` — chụp ảnh/kiểm tra trong Node (cùng engine với trình duyệt).
- `../../live/` — đường tắt: `/live/` ở gốc site chuyển thẳng tới đây, giữ nguyên tham số.

## Chạy

```sh
python3 -m http.server 8000          # rồi mở http://localhost:8000/live/
```

Trong player: **Space** chạy/tạm dừng, **◀ ▶** lùi/tiến một giây, **1–4** đổi cảnh, **W** wallpaper, **C** đồng hồ,
**Esc** thoát wallpaper. URL là cách cấu hình duy nhất cần nhớ:

```
…/live/?scene=hoi-an&seed=amber-vale-7&wallpaper=1&clock=1
```

| tham số | nghĩa |
| --- | --- |
| `scene` | `ha-long` · `ruong-bac-thang` · `hoi-an` · `rung-tre` |
| `seed` | hạt giống dạng chữ, như ở đảo (`heron-bay-8`) |
| `size` | `480` (mặc định) hoặc `960` — cảnh vẽ ở 480×270 rồi phóng theo pixel nguyên |
| `wallpaper=1` | vào thẳng chế độ wallpaper |
| `clock=1` | hiện giờ và ngày tháng lên cảnh |

Trong Node:

```sh
node examples/live/live.mjs --check                                  # bốn cảnh: vòng lặp có khít không, một khung tốn bao lâu
node examples/live/live.mjs --scene rung-tre --sheet sheet.png --at 3,12,30,55
node examples/live/live.mjs --scene hoi-an --seed amber-vale-7 --still 9 hoi-an.png
```

## Đo trên máy này

480×270, Node: **5–10 ms một khung** cho cả bốn cảnh (mỗi khung có 50 ms ở 20 khung/giây) và seam của vòng lặp là
**0 pixel** — `live.mjs --check` kiểm cả hai điều này. Mỗi cảnh dùng 31–36 kỹ thuật; dòng *Đã dùng* trong player
đếm trực tiếp như trang island vẫn đếm.

## Đóng gói thành live wallpaper thật

Engine không giữ trạng thái chạy: đưa số khung nào nhận đúng khung đó. Vì vậy cùng một URL chạy được ở nhiều nơi —
trỏ **Wallpaper Engine / Lively** (Windows) hay **Plash / ScreenPlay** (macOS / Linux) tới
`…/live/?scene=…&wallpaper=1` như một web wallpaper; trên Android là một `WallpaperService` bọc WebView; hoặc một
cửa sổ trình duyệt kiosk thường trực. Ba điều player này đã lo sẵn, nên giữ khi đóng gói lại:

1. **Tab ẩn thì không vẽ** — vòng lặp thuần số khung nên hiện lại là đúng cảnh, mà pin thì đỡ.
2. **`prefers-reduced-motion`** — người dùng bật giảm chuyển động thì cảnh tự đứng yên.
3. **Không chữ trong hình** — bốn cảnh không nướng chữ vào pixel; giờ giấc là lớp phủ riêng, tắt được bằng `C`.

## Thêm một cảnh nữa

Mỗi cảnh là một renderer trong `scenes.js`: một hàm nhận hạt giống, dựng phần tĩnh một lần (trời, đất, nhà cửa —
sprite được giữ trong `stampCache`), rồi trả về `render(t)` vẽ phần động theo đúng thời điểm `t` của vòng lặp.
Quy tắc duy nhất: mọi chuyển động phải là hàm của `t` (và tự khít ở giây 60) — không tích lũy trạng thái theo khung,
vậy nên quay lui, nhảy cóc hay Render trong Node đều cho một hình. Đăng ký cảnh mới ở `SCENES` và bảng `scenes`
cuối file; player tự có nút cho nó.
