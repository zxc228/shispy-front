Place your licensed SF Pro Display fonts here as .woff2 files, for example:

- SFProDisplay-Regular.woff2 (400)
- SFProDisplay-Medium.woff2  (500)
- SFProDisplay-Semibold.woff2 (600)
- SFProDisplay-Bold.woff2   (700)

Then extend src in src/style.css @font-face rules, e.g.:

@font-face {
  font-family: "SF_Pro_Display";
  src: url('/fonts/SFProDisplay-Regular.woff2') format('woff2'),
       local('SF Pro Display'), local('SFProDisplay-Regular');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

Note: SF Pro is licensed by Apple and not redistributed in this repo. Use your own licensed files.
