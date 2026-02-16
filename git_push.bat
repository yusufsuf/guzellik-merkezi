@echo off
set PATH=C:\Program Files\Git\bin;%PATH%
git add .
git commit -m "guvenlik-iyilestirmeleri"
git push origin main
echo DONE
