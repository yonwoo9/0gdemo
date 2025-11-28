package main

import (
	"context"
	"log"

	"github.com/0glabs/0g-storage-client/common"
	"github.com/0glabs/0g-storage-client/core"
	"github.com/0glabs/0g-storage-client/node"
	"github.com/0glabs/0g-storage-client/transfer"
	ecommon "github.com/ethereum/go-ethereum/common"
	"github.com/sirupsen/logrus"
)

var (
	fileName     = "test.txt"
	fragmentSize = 10
	nodes        = []*node.ZgsClient{}
	roots        = []ecommon.Hash{}
)

func init() {
	urls := []string{
		"http://127.0.0.1:5678",
		"http://127.0.0.1:5679",
		"http://127.0.0.1:5680",
	}

	nodes = node.MustNewZgsClients(urls)
}

func main() {
	if err := upload(fileName); err != nil {
		log.Fatalf("upload failed: %v", err)
	}
	if err := download(fileName); err != nil {
		log.Fatalf("download failed: %v", err)
	}
}

func upload(fileName string) error {
	uploader, err := transfer.NewUploader(context.Background(), nil, nodes, common.LogOption{
		Logger: logrus.StandardLogger(),
	})
	if err != nil {
		return err
	}

	file, err := core.Open(fileName)
	if err != nil {
		return err
	}
	defer file.Close()

	_, roots, err = uploader.SplitableUpload(context.Background(), file, int64(fragmentSize), transfer.UploadOption{})
	if err != nil {
		return err
	}

	return nil
}

func download(fileName string) error {
	downloader, err := transfer.NewDownloader(nodes, common.LogOption{
		Logger: logrus.StandardLogger(),
	})
	if err != nil {
		return err
	}

	rootsStr := make([]string, len(roots))
	for i, root := range roots {
		rootsStr[i] = root.String()
	}

	if err := downloader.DownloadFragments(context.Background(), rootsStr, fileName, false); err != nil {
		return err
	}

	return nil
}
