import asyncio
import websockets
from PIL import Image, ImageDraw, ImageFont, ImageStat
import numpy
import  base64
import io
import torch
from torch.nn import Sequential, Module
from torchvision import transforms
from torchvision.utils import save_image
import cv2
import argparse

class WebSockets_Server:
	
    def __init__(self, loop, address , port, mode_pixcel):
        self.loop = loop
        self.address = address
        self.port = port
        self.mode_pixcel = mode_pixcel  # True:ピクセルデータ形式,False=ファイル形式

    async def _handler(self, websocket, path):
        while True:
            recv_data = await websocket.recv()

            model_import = __import__('model_gan', fromlist=['model', 'immean', 'imstd'])
            model = model_import.model
            immean = model_import.immean
            imstd = model_import.imstd

            use_cuda = torch.cuda.device_count() > 0

            model.load_state_dict(torch.load("model_gan" + ".pth"))
            model.eval()
            
            with open('./test.png','bw') as f:
                img_binary=base64.b64decode(recv_data)
                f.write(img_binary)
            
            data = Image.open('test.png').convert('L')
            w, h = data.size[0], data.size[1]
            pw = 8 - (w % 8) if w % 8 != 0 else 0
            ph = 8 - (h % 8) if h % 8 != 0 else 0
            stat = ImageStat.Stat(data)

            data = ((transforms.ToTensor()(data) - immean) / imstd).unsqueeze(0)
            if pw != 0 or ph != 0:
                data = torch.nn.ReplicationPad2d((0, pw, 0, ph))(data).data

            if use_cuda:
                pred = model.cuda().forward(data.cuda()).float()
            else:
                pred = model.forward(data)
            save_image(pred[0], 'out.png')

            with open('./out.png', 'rb') as f:
                img_binary = f.read()
            await websocket.send(img_binary)
            print(img_binary)	

    def run(self):
        self._server = websockets.serve(self._handler, self.address, self.port)
        self.loop.run_until_complete(self._server)
        self.loop.run_forever()

if __name__ == '__main__':
    loop = asyncio.get_event_loop()
    wss = WebSockets_Server(loop, '133.27.175.30', 1145, mode_pixcel=False)
    wss.run()
