npm run build-docs
cd docs/.vuepress/dist
git init
git add -A
git commit -m 'deploy'
git push -f https://github.com/noam-honig/hagai-docs.git master