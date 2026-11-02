"""Cut the people out of every frame with rembg (isnet-general-use). pip install "rembg[cpu]". Slow: run once."""
import os
from rembg import new_session, remove
from PIL import Image
s = new_session('isnet-general-use'); os.makedirs('m720', exist_ok=True)
for f in sorted(os.listdir('f720')):
    remove(Image.open('f720/' + f).convert('RGB'), session=s, only_mask=True).save('m720/' + f)
