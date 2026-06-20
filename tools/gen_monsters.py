#!/usr/bin/env python3
"""Generate ORIGINAL CC0 monster sprite sheets matching the hero style.
Output: public/assets/sprites/monster-*.png  (4 frames: walk x3 + attack).
Small mobs 22x22, bosses 40x40. Original work, CC0 / public domain."""
from PIL import Image
import os, math

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "sprites")
os.makedirs(OUT, exist_ok=True)
OL = (10,10,20,255)
def Hx(s,a=255):
    s=s.lstrip('#'); return (int(s[0:2],16),int(s[2:4],16),int(s[4:6],16),a)

RAMP = {
 'grunt': dict(b0='#1c4a1e',b1='#2f7a33',b2='#56b85a',ac='#9adf6a',eye='#ffe23a',dt='#123314'),
 'ghost': dict(b0='#2a3b6a',b1='#5a73c0',b2='#a9c4ff',ac='#dceaff',eye='#ff5a8a',dt='#1a2746'),
 'demon': dict(b0='#5a1208',b1='#a82414',b2='#e04a26',ac='#ff9a3a',eye='#ffe23a',dt='#380a04'),
 'bone_archer': dict(b0='#7d7660',b1='#c9c2a6',b2='#efe9cf',ac='#9b3a2a',eye='#ff5a3a',dt='#4a4636'),
 'brute': dict(b0='#3a2418',b1='#6e4326',b2='#9c6a3c',ac='#c0392b',eye='#ffd24a',dt='#1f120a'),
 'imp': dict(b0='#6a1408',b1='#c4361a',b2='#ff7a2a',ac='#ffd24a',eye='#fff4b0',dt='#360a04'),
 'grave_warden': dict(b0='#1a1426',b1='#382a52',b2='#6a4f9a',ac='#b58aff',eye='#3affd0',dt='#0c0814'),
 'molten_colossus': dict(b0='#2a1410',b1='#6e2414',b2='#c4451c',ac='#ffae2a',eye='#fff0a0',dt='#140805'),
}

class F:
    def __init__(s,S): s.S=S; s.im=Image.new('RGBA',(S,S),(0,0,0,0))
    def px(s,x,y,c):
        if 0<=x<s.S and 0<=y<s.S and c[3]>0: s.im.putpixel((int(x),int(y)),c)
    def r(s,x,y,w,h,c):
        for j in range(int(y),int(y+h)):
            for i in range(int(x),int(x+w)): s.px(i,j,c)
    def disc(s,cx,cy,rad,c):
        for j in range(s.S):
            for i in range(s.S):
                if (i+.5-cx)**2+(j+.5-cy)**2<=rad*rad: s.px(i,j,c)
    def outline(s):
        src=s.im.copy(); S=s.S
        op=lambda x,y:0<=x<S and 0<=y<S and src.getpixel((x,y))[3]>40
        for y in range(S):
            for x in range(S):
                if src.getpixel((x,y))[3]>40: continue
                if op(x-1,y)or op(x+1,y)or op(x,y-1)or op(x,y+1): s.im.putpixel((x,y),OL)

def eyes(f,cx,y,col,sp=3):
    f.px(cx-sp,y,col); f.px(cx-sp+1,y,col); f.px(cx+sp,y,col); f.px(cx+sp-1,y,col)

# ---------- small mobs (22x22) ----------
def grunt(fr,P):
    f=F(22); cx=11; bob=[0,-1,0,-1][fr]; b1,b2,b0=Hx(P['b1']),Hx(P['b2']),Hx(P['b0'])
    leg=[(8,12),(13,12)] if fr!=1 else [(7,12),(13,11)]
    for lx,ly in leg: f.r(lx,ly+6+bob,3,4,b0)
    f.disc(cx,12+bob,6,b1)                 # body
    f.disc(cx-2,10+bob,3,b2)               # highlight
    f.r(cx-5,11+bob,2,4,b1); f.r(cx+3,11+bob,2,4,b1)  # arms
    f.disc(cx,6+bob,4,b2)                  # head
    eyes(f,cx,5+bob,Hx(P['eye']))
    if fr==3:
        f.r(cx-1,7+bob,4,2,Hx(P['dt']))    # open maw
        f.r(cx-7,9+bob,3,2,b2); f.r(cx+5,9+bob,3,2,b2)  # claws out
    f.outline(); return f.im

def ghost(fr,P):
    f=F(22); cx=11; bob=[0,-1,-2,-1][fr]; b1,b2=Hx(P['b1'],235),Hx(P['b2'],235)
    f.disc(cx,8+bob,6,b1)
    f.disc(cx-2,6+bob,3,b2)
    # wispy tatters
    for k,wx in enumerate([2,6,10,14,17]):
        h=[5,3,6,3,5][k]+(1 if (k+fr)%2 else 0)
        f.r(cx-9+wx,12+bob,2,h,b1)
    eyes(f,cx,7+bob,Hx(P['eye']),2)
    if fr>=2: f.r(cx-1,9+bob,3,2,Hx(P['dt']))  # wail mouth
    f.outline(); return f.im

def demon(fr,P):
    f=F(22); cx=11; bob=[0,-1,0,-1][fr]; b1,b2,b0=Hx(P['b1']),Hx(P['b2']),Hx(P['b0'])
    f.r(8,16+bob,3,4,b0); f.r(12,16+bob,3,4,b0)
    f.disc(cx,12+bob,6,b1); f.disc(cx-2,10+bob,3,b2)
    f.r(cx-6,10+bob,2,5,b1); f.r(cx+4,10+bob,2,5,b1)
    f.disc(cx,6+bob,4,b1)
    f.r(cx-4,2+bob,2,3,Hx(P['ac'])); f.r(cx+3,2+bob,2,3,Hx(P['ac']))  # horns
    eyes(f,cx,5+bob,Hx(P['eye']))
    if fr==3:
        f.r(cx-2,7+bob,5,2,Hx(P['ac']))   # roar
        f.r(cx-8,9+bob,3,2,b2); f.r(cx+6,9+bob,3,2,b2)
    f.outline(); return f.im

def bone_archer(fr,P):
    f=F(22); cx=10; bob=[0,-1,0,-1][fr]; b2,b1,dt=Hx(P['b2']),Hx(P['b1']),Hx(P['dt'])
    f.r(8,15+bob,2,5,b1); f.r(12,15+bob,2,5,b1)
    f.r(cx-3,9+bob,6,7,b1)                 # ribcage
    for ry in range(10,16,2): f.r(cx-3,ry+bob,6,1,dt)
    f.disc(cx,6+bob,4,b2)                  # skull
    f.px(cx-2,5+bob,dt); f.px(cx+2,5+bob,dt); f.r(cx-1,8+bob,3,1,dt)
    # bow (right)
    bx=16
    f.r(bx,4+bob,1,12,Hx(P['ac'])); f.px(bx-1,3+bob,Hx(P['ac'])); f.px(bx-1,16+bob,Hx(P['ac']))
    if fr==3: f.r(cx+3,9+bob,bx-cx-2,1,Hx('#e8e8e8'))  # drawn arrow
    else: f.r(bx-1,9+bob,1,1,Hx('#e8e8e8'))
    f.outline(); return f.im

def brute(fr,P):
    f=F(22); cx=11; bob=[0,-1,0,-1][fr]; b1,b2,b0=Hx(P['b1']),Hx(P['b2']),Hx(P['b0'])
    f.r(7,17+bob,4,4,b0); f.r(12,17+bob,4,4,b0)
    f.disc(cx,12+bob,8,b1)                 # big body
    f.disc(cx-3,9+bob,4,b2)
    ay=8 if fr!=3 else 4
    f.r(2,ay+bob,3,8,b1); f.r(17,ay+bob,3,8,b1)   # huge arms
    f.disc(cx,6+bob,3,b1)                  # small head
    eyes(f,cx,6+bob,Hx(P['eye']),2)
    if fr==3:
        f.r(cx-2,4+bob,5,2,Hx(P['dt']))
        f.r(2,3+bob,4,3,b2); f.r(16,3+bob,4,3,b2)  # fists raised
    f.outline(); return f.im

def imp(fr,P):
    f=F(22); cx=11; bob=[0,-2,0,-2][fr]; b1,b2=Hx(P['b1']),Hx(P['b2'])
    wf=[0,2,0,2][fr]
    f.r(2,8-wf+bob,4,5,Hx(P['ac'])); f.r(16,8-wf+bob,4,5,Hx(P['ac']))  # bat wings
    f.disc(cx,11+bob,4,b1); f.disc(cx-1,10+bob,2,b2)
    f.r(cx+3,13+bob,4,2,b1)                # tail
    f.disc(cx,7+bob,3,b1)
    f.px(cx-3,4+bob,Hx(P['ac'])); f.px(cx+3,4+bob,Hx(P['ac']))  # horns
    eyes(f,cx,6+bob,Hx(P['eye']),2)
    if fr==3: f.r(cx-1,8+bob,3,1,Hx(P['dt']))
    f.outline(); return f.im

# ---------- bosses (40x40) ----------
def grave_warden(fr,P):
    f=F(40); cx=20; bob=[0,-2,0,-2][fr]; b1,b2,b0=Hx(P['b1']),Hx(P['b2']),Hx(P['b0'])
    # tattered robe
    f.disc(cx,24+bob,12,b1); f.disc(cx-4,20+bob,6,b2)
    for k,wx in enumerate(range(6,34,5)):
        h=[6,9,5,9,6,9][k%6]+(2 if (k+fr)%2 else 0)
        f.r(wx,32+bob,3,h,b1)
    f.r(cx-9,16+bob,4,12,b1); f.r(cx+5,16+bob,4,12,b1)  # arms
    f.disc(cx,12+bob,7,b0)                  # hood
    f.disc(cx,12+bob,4,Hx(P['dt']))
    eyes(f,cx,12+bob,Hx(P['eye']),3)
    # scythe (right)
    sx=32; sy=6+bob
    f.r(sx,sy,2,26,Hx('#5a4a2a'))
    blade= [(sx-8,sy),(sx,sy)] if fr!=3 else [(sx-12,sy+4),(sx,sy)]
    f.r(blade[0][0],blade[0][1],10,2,Hx(P['ac']))
    if fr==3: f.r(cx-3,14+bob,6,2,Hx(P['ac']))
    f.outline(); return f.im

def molten_colossus(fr,P):
    f=F(40); cx=20; bob=[0,-1,0,-1][fr]; b0,b1,b2,ac=Hx(P['b0']),Hx(P['b1']),Hx(P['b2']),Hx(P['ac'])
    f.r(11,30+bob,7,9,b0); f.r(22,30+bob,7,9,b0)     # legs
    f.disc(cx,22+bob,13,b1)                  # hulking body
    f.disc(cx-4,17+bob,6,b2)
    # lava veins
    for vx,vy in [(14,20),(24,24),(18,28),(22,18)]:
        f.r(vx,vy+bob,2,4,ac); f.px(vx,vy+bob,Hx('#fff0a0'))
    ay=14 if fr!=3 else 8
    f.r(3,ay+bob,6,14,b1); f.r(31,ay+bob,6,14,b1)    # arms
    f.disc(cx,12+bob,6,b0)                   # head
    eyes(f,cx,12+bob,Hx(P['eye']),3)
    if fr==3:
        f.r(cx-4,13+bob,9,3,Hx('#fff0a0'))   # blazing maw
        f.disc(7,8+bob,4,ac); f.disc(33,8+bob,4,ac)  # fists glow
    f.outline(); return f.im

MOBS = {'grunt':(grunt,22),'ghost':(ghost,22),'demon':(demon,22),'bone_archer':(bone_archer,22),
        'brute':(brute,22),'imp':(imp,22),'grave_warden':(grave_warden,40),'molten_colossus':(molten_colossus,40)}
for name,(fn,S) in MOBS.items():
    sheet=Image.new('RGBA',(S*4,S),(0,0,0,0))
    for fr in range(4): sheet.alpha_composite(fn(fr,RAMP[name]),(fr*S,0))
    fname='monster-'+name+'.png'
    sheet.save(os.path.join(OUT,fname)); print('wrote',fname,sheet.size)
print('DONE')
