#!/usr/bin/env bash
set -eu

SRC_DIR=$(cd $(dirname ${BASH_SOURCE:-$0}); cd ../; pwd)

if [ $# -eq 1 ]; then
	TARGET_REPO="$1"
else
	TARGET_REPO=""
fi

if [ -e objects/pack/*.pack ]; then
	mv $(ls objects/pack/*.pack) ./
	git unpack-objects < $(ls ./*.pack)
elif [ -e ${SRC_DIR}/target/${TARGET_REPO}/objects/pack/*.pack ]; then
	mv $(ls ${SRC_DIR}/target/${TARGET_REPO}/objects/pack/*.pack) ${SRC_DIR}/target/${TARGET_REPO}/
	cd ${SRC_DIR}/target/${TARGET_REPO} && git unpack-objects < $(ls ./*.pack)
else
	echo "There is nothing to do."
fi