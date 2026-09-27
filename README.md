# Polyphase portfolio

The spiral scene is rendered with the local Three.js files in `vendor/`.

## Recommended editor

Use [Visual Studio Code](https://code.visualstudio.com/) and open this entire folder.
Install the **Live Server** extension if you want a one-click local preview, then right-click `index.html` and choose **Open with Live Server**.

## Replace project images

图片替换位置就是项目里的 `assets/` 文件夹。10 个项目已经按顺序预留好了文件名，不需要再改代码。

1. 把第一张图命名为 `01.jpg`，放进 `assets/`。
2. 第二张命名为 `02.jpg`，依次到 `10.jpg`。
3. 刷新网页，页面会自动读取已经上传的编号图片；还没上传的编号继续显示占位图。

编号对应关系是：`01.jpg` = Afterlight，`02.jpg` = Soft Static，`03.jpg` = Glass House，一直到 `10.jpg` = Chromatic Air。

同一张图片会自动显示在螺旋卡片、List 列表和项目详情页。

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

- `radiusX`: horizontal width of the spiral.
- `radiusZ`: depth of the spiral.
- `spacing`: vertical distance between cards.
- `angleStep`: rotation between consecutive cards.
- `scale`, `rotation` and the curved panel geometry: perspective and card orientation.

Wheel and drag sensitivity are near the bottom of `app.js` in the `wheel` and `pointermove` handlers.
