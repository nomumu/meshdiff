# meshdiff

Gitで管理されたメッシュを視覚的に比較するためのツールです。  
![動作の例](https://github.com/nomumu/meshdiff/blob/image/example.gif)  

## 動作環境
このツールは下記に依存しています。動作確認に使用したバージョンも次の通りです。

- git client (v2.15.1)  
- [three.js](https://github.com/mrdoob/three.js) (r118)  
- [imaya/zlib.js](https://github.com/imaya/zlib.js) (develop)  
- Google Chrome (v83)  
- Visual Studio Code (v1.46.1)  
Live Server extension (5.6.1)

## インストール方法

このツールの動作にはいくつかのjsファイルとツールのインストールが必要です。  
- jsディレクトリに下記ファイルをコピーして下さい  
  - three.min.js ([three.js](https://github.com/mrdoob/three.js/tree/dev/build/))
  - STLLoader.js ([three.js](https://github.com/mrdoob/three.js/tree/dev/examples/js/loaders))
  - OrbitControls.js ([three.js](https://github.com/mrdoob/three.js/blob/dev/examples/js/controls/))
  - inflate_stream.min.js ([imaya/zlib.js](https://github.com/imaya/zlib.js/blob/develop/bin/))

各ファイルをコピーするとjsフォルダはこのようになります。  
![インストール後](https://github.com/nomumu/meshdiff/blob/image/install_js.png)

- ローカル環境で動作するHTTPサーバをインストールして下さい  
Visual Studio Codeの[Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)拡張機能を利用することを推奨します。  

## git情報の格納
このツールは`target`以下に`git clone --mirror`されたフォルダ内のgit情報からメッシュファイル（STLファイルのみ）をリストアップします。次のようにgit cloneを行って下さい。  

```sh
meshdiff/target$ git clone --mirror https://HOWTOUSE.git (メッシュを含むリポジトリ)
```
`clone`した後、gitオブジェクトが`pack`されている場合はこれを展開する必要があります。次のようにすると確認できます。  
```sh
meshdiff/target$ cd HOTTOUSE.git
meshdiff/target/HOWTOUSE.git$ cd objects/pack
meshdiff/target/HOWTOUSE.git/objects/pack$ ls
nanika-hash-value.idx
nanika-hash-value.pack
```
上のように`.pack`ファイルが存在する場合はこれを展開します。  
`.pack`ファイルを`objects`よりも上の階層へ移動し、`git unpack-objects`コマンドを実行します。  

```sh
meshdiff/target/HOWTOUSE.git/objects/pack$ mv nanika-hash-value.pack ../..
meshdiff/target/HOWTOUSE.git/objects/pack$ cd ../..
meshdiff/target/HOWTOUSE.git$ git unpack-objects < nanika-hash-value.pack
```
`objects`以下に00～FFからなる名前のディレクトリが展開されていれば成功です。  

## 使い方

HTTPサーバを起動します。VSCodeのLive Server拡張機能を利用する場合は画面の右下に起動ボタンがあるので操作します。  
![インストール後](https://github.com/nomumu/meshdiff/blob/image/live_server.png)  
起動すると次のようなインタフェースにブラウザからアクセスできます。  
![インタフェース](https://github.com/nomumu/meshdiff/blob/image/interface.png)  

各インタフェースの使用方法は次の通りです。  
- フォルダ名入力  
`target`以下に作成したgit情報のディレクトリ名を入力します。  
- ブランチ名入力  
meshdiffが取り出すブランチ名を入力します。デフォルトは`master`です。  
- Gitデータロード  
指定されたGitデータを`target`ディレクトリ内からロードします。コミット数が多い場合は時間がかかります。  
- ファイル選択  
表示するメッシュファイルを選択します。  
- モデルスケール選択  
メッシュの描画スケールを選択します。  
- リビジョン選択  
選択したメッシュファイルのリビジョンを選択します。Beforeが赤色、Afterが緑色で表示されます。  
- 透過率  
表示しているメッシュの透過率を指定します。  
- Afterを保存  
Afterのリビジョンリストで選択しているメッシュをブラウザのダウンロード機能で保存します。  
- メッシュ表示
メッシュを表示します。  
  - マウス左ドラッグ  
  表示を回転します。  
  - マウス右ドラッグ  
  表示を平行移動します。  
  - スクロール
  表示を拡大/縮小します。  
  - XYZ表示
  赤:X軸、緑:Y軸, 青:Z軸 です。
  - グリッド表示
  1cm四方のグリッドで25cmの範囲を表示しています。
- クリア  
メッシュ表示をクリアします。  
