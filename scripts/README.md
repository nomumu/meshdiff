# meshdiff/scripts

各スクリプトの使い方について説明します。  
このスクリプトの実行には`mv`コマンドや`cd`コマンドが実行できる環境が必要です。Windowsの場合はMinGW等の環境が必要です。

## `run-server.sh`

Python3でHTTPサーバを起動します。

meshdiffディレクトリ内で以下のコマンドを実行すると起動できます。

```sh
./scripts/run-server.sh
```

## `unpack-objects.sh`

`git unpack-objects`を簡単に実行するためのスクリプトです。

使用方法は2通りあります。

### 1. `git clone --mirror`でダウンロードしたディレクトリ内で実行

`git clone --mirror`でダウンロードしたディレクトリ内で`unpack-objects.sh`を実行します。

例えば、`target/stl_repo.git`内で実行する場合は以下のコマンドを実行します。

```sh
../../scripts/unpack-objects.sh
```

### 2. `target`ディレクトリ内のパスを引数としてセットして実行

`target`ディレクトリからのGitディレクトリへのパスを引数として指定すると、スクリプト内で`cd`して`git unpack-objects`を実行します。

例えば、`target/stl_repo.git`内でのPackfileを展開する場合はmeshdiffのディレクトリ内で以下のコマンドを実行します。

```sh
./scripts/unpack-objects.sh stl_repo.git
```