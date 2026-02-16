@echo off
set PATH=C:\Program Files\Git\bin;%PATH%
git add .
git commit -m "nginx-fix"
git push origin main
echo DONE
