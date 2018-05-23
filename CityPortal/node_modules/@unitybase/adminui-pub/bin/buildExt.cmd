if not exist dist (mkdir dist) else (del .\dist\ext-all.* /Q)
npx uglifyjs ext-all-debug-w-comments.js -o ./dist/ext-all.min.js --screw-ie8 --prefix relative --compress --mangle
