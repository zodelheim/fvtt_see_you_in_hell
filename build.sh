#!/usr/bin/env bash

BUILD_DIR="build"
BUILD_NAME=$(basename "$PWD")

mkdir -p $BUILD_DIR
zip -r $BUILD_DIR/$BUILD_NAME.zip system.json template.json assets/ styles/ lang/ru.json templates/ module/ packs/