# Polyphase portfolio

The spiral scene is rendered with the local Three.js files in `vendor/`.

The spiral view uses a cold silver and ice-blue glass-study background with translucent depth planes, soft cyan light, and fine grid lines. Project images are rendered from the original files; display-only brightness adjustment is applied in the spiral shader and does not rewrite the assets.

## Recommended editor

Use [Visual Studio Code](https://code.visualstudio.com/) and open this entire folder.
Install the **Live Server** extension if you want a one-click local preview, then right-click `index.html` and choose **Open with Live Server**.

## Replace project images

图片替换位置就是项目里的 `assets/` 文件夹。页面只认这一组固定文件名，不需要改代码：

1. 把第一张图命名为 `01.jpg`、`01.png`、`01.webp` 或 `01.jpeg`，放进 `assets/`。
2. 第二张命名为 `02` 加上同样的扩展名，依次到 `10`。
3. 刷新网页，页面会自动读取对应编号图片；缺少的编号会显示同编号占位图。

编号对应关系是：`01.jpg` = Afterlight，`02.jpg` = Soft Static，`03.jpg` = Glass House，一直到 `10.jpg` = Chromatic Air。

对应关系由数组位置决定：第 1 个项目永远读取 `01.jpg`，第 2 个项目永远读取 `02.jpg`，依次到第 10 个项目。相同文件会显示在螺旋卡片、List 列表和项目详情页。

每次页面打开都会给图片请求加新的版本参数，所以替换 GitHub 上的图片后，刷新页面不会继续使用旧缓存。

## Add project demo videos

如果某个项目有演示视频，把它放进 `assets/` 并命名为 `04_演示视频.mp4` 这种格式，编号与项目图片一致。支持 `.mp4`、`.webm` 和 `.mov`。点击对应项目后，视频会自动出现在详情页图片下方，并使用浏览器原生播放控件。

GitHub 普通仓库单个文件不能超过 100 MB。超过这个限制的视频需要先压缩，或改用 Git LFS / 其他视频托管服务；页面代码仍会自动识别同名视频文件。

## Edit content

- Project titles, dates and descriptions: the `projects` array at the top of `app.js`.
- Navigation and About text: `index.html`.
- Colors, spacing and typography: `styles.css`.

## Background music

The page uses `assets/ambient-pixabay.mp3` as a looped background track. It is the track [Ambient Techno by alex-morgan](https://pixabay.com/music/beats-ambient-techno-601098/), marked by Pixabay as free to use under the [Pixabay Content License](https://pixabay.com/service/license-summary/). Keep the license page and attribution details with the project when publishing.

To replace it, put another MP3 in `assets/` and change the `new Audio("./assets/ambient-pixabay.mp3")` path near the top of `app.js`.

## Publish on GitHub Pages

Yes. This is a static site, so GitHub Pages can host it directly. Keep `index.html` at the repository root and upload the complete folder, including `vendor/` and `assets/`. The local `server.cjs` is only for previewing on your computer and is not needed by GitHub Pages.

For a personal homepage, create a repository named `<your-username>.github.io`, push these files to its `main` branch, then open **Settings -> Pages** and choose **Deploy from a branch**, branch `main`, folder `/ (root)`. The site will be available at `https://<your-username>.github.io/`.

GitHub Pages is available for public repositories on GitHub Free. Private-repository Pages requires a plan that supports it.

## Tune the spiral

The constants near the top of `app.js` and the `syncPanels()` function contain the main controls:

- `CYLINDER_RADIUS`: horizontal and depth radius of the cylinder.
- `VERTICAL_SPACING`: vertical distance between cards.
- `ANGLE_STEP`: rotation between consecutive cards.
- `CARD_WIDTH`, `CARD_HEIGHT` and the shader geometry: card size and curvature.

Wheel and drag sensitivity are near the bottom of `app.js` in the `wheel` and `pointermove` handlers.
