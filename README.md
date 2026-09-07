# Glitch Studio for Web

Glitch Studio for Webは、画像・動画編集や、シェーダーのplaygroundとして使えるWebアプリケーションです。

- 全ての画像処理がGPU上で行われ、高効率です
- resolution-independentなので、どのような解像度でレンダリングしても見た目が変わらず、一貫した結果が得られます
- fps-independentなので、どのようなフレームレートでレンダリングしても動きの速さが変わらず、一貫した結果が得られます
- aspect-ratio-independentなので、どのような比率でレンダリングしても歪まず、一貫した結果が得られます(※一部例外あり)
- 式を[AiScript](https://aiscript-dev.github.io/ja/)として解釈可能です

## 概念

「ノード」を組み合わせて、画像を加工していく仕組みです。

ノードは関数のようなもので、入力を受け取って(受け取らないものもあります)出力を返します。
