var gulp        = require('gulp');
var browserSync = require('browser-sync');
var sass        = require('gulp-sass');
var prefix      = require('gulp-autoprefixer');
var autoprefixer = require('autoprefixer');
var cp          = require('child_process');
var minifycss   = require('gulp-minify-css');
var iconfont    = require('gulp-iconfont');
var svg2png     = require('gulp-svg2png');
var pump        = require('pump');
var uglify      = require('gulp-uglify');
var rename      = require("gulp-rename");
var postcss     = require('gulp-postcss');
var cssnano     = require('gulp-cssnano');
var runTimestamp = Math.round(Date.now()/1000);
var iconfontCss = require('gulp-iconfont-css');
var fontName    = 'byot';
var messages    = {
    jekyllBuild: '<span style="color: grey">Running:</span> $ jekyll build'
};

/**
 * Build the Jekyll Site
 */
gulp.task('jekyll-build', function (done) {
    browserSync.notify(messages.jekyllBuild);
    return cp.spawn('jekyll', ['build'], {stdio: 'inherit'})
        .on('close', done);
});

/**
 * Rebuild Jekyll & do page reload
 */
gulp.task('jekyll-rebuild', ['jekyll-build'], function () {
    browserSync.reload();
});

/**
 * Wait for jekyll-build, then launch the Server
 */
gulp.task('browser-sync', ['sass', 'jekyll-build'], function() {
    browserSync({
        server: {
            baseDir: '_site'
        }
    });
});


// Static Server + watching scss/html files
gulp.task('watch', ['sass'], function() {
    gulp.watch("_sass/**/*.scss", ['sass']);
    gulp.watch(['index.html', '_layouts/*.html', '_posts/*', '_utilities/*', 'additional-utilities/*', '_partners/*', 'contact/*', 'about.html', 'faq.html', 'faq.md', 'about/*', 'img/*', '_includes/*', '_faqs/*', 'coned.html', 'js/*', 'about/*', 'adventures/*', '_config.yml', 'stripe/*', 'stripe/71437582c5fc56a13b8ffde25cc569e50f8e1893/*', 'product/*', 'product/71437582c5fc56a13b8ffde25cc569e50f8e1893/*'], ['jekyll-rebuild','sass']);
});

// Compile sass into CSS & auto-inject into browsers
gulp.task('sass', function() {
    var processors = [
        autoprefixer({browsers: ['last 2 versions', '> 1%', 'Firefox ESR']})
    ];
    return gulp.src('./_sass/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(cssnano())
    .pipe(rename('styles.css'))
    .pipe(gulp.dest("_site/assets/css"))
    .pipe(browserSync.stream());
});


gulp.task('compress', function (cb) {
  var files = ['js/index.js', 'js/source.js'];
  pump([
        gulp.src(files)
            .pipe(rename({ suffix: '.min' })),
        uglify(),
        gulp.dest('js/')
    ],
    cb
  );
});

gulp.task('default', ['browser-sync', 'watch', 'compress']);


gulp.task('iconfont', function(){
  return gulp.src(['icons/*.svg'])
    .pipe(iconfontCss({
      fontName: fontName,
      path: 'sass/templates/_icons.scss',
      targetPath: '../sass/modules/_icons.scss',
      fontPath: '/webfonts/'
    }))
    .pipe(iconfont({
      fontName: fontName, // required 
      appendUnicode: true, // recommended option 
      formats: ['ttf', 'eot', 'woff'], // default, 'woff2' and 'svg' are available 
      timestamp: runTimestamp, // recommended to get consistent builds when watching files 
    }))
      .on('glyphs', function(glyphs, options) {
        // CSS templating, e.g. 
        console.log(glyphs, options);
      })
    .pipe(gulp.dest('webfonts/'));
});

gulp.task('svgfallback', function () {
    gulp.src('img/*.svg')
        .pipe(svg2png())
        .pipe(gulp.dest('./img'));
});