#!/usr/bin/bash

# This script is used to generate the PKGBUILD file for the -bin AUR package.

version=$1
targetDir=$2
echo "version: $version" > /dev/stderr
echo "targetDir: $targetDir" > /dev/stderr
sha256sum=`sha256sum $targetDir/release/bundle/deb/kittygifs_${version}_amd64.deb | awk '{print $1}'`

text="# Maintainer: Jan0660 <jan0660@tutanota.com>
pkgname=kittygifs-bin
pkgdesc=\"A tool to optimize your gifkittyposting, and of course posting of other gifs.\"
pkgver=\"$version\"
pkgrel=1
pkgbase=kittygifs-bin
arch=(\"x86_64\")
url=\"https://github.com/Jan0660/kittygifs\"
license=(\"AGPL3\")
groups=()
makedepends=()
depends=(\"webkit2gtk-4.1\" \"appmenu-gtk-module\" \"gtk3\" \"libappindicator-gtk3\")
optdepends=(\"xdotool: for automatic posting on Xorg\" \"ydotool: for automatic posting on Wayland(and Xorg)\")
source=(\"https://github.com/Jan0660/kittygifs/releases/download/v$version/kittygifs_${version}_amd64.deb\")
sha256sums=(\"$sha256sum\")

package() {
    tar -xf data.tar.gz -C \"\$pkgdir\"
    chmod +x \$pkgdir/usr/bin/kittygifs
}"

echo "$text"
