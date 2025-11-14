package main

import (
	"context"
	"log"

	"github.com/0glabs/0g-storage-client/common"
	"github.com/0glabs/0g-storage-client/core"
	"github.com/0glabs/0g-storage-client/node"
	"github.com/0glabs/0g-storage-client/transfer"
	"github.com/sirupsen/logrus"
)

func main() {
	fileName := "test.txt"
	if err := upload(fileName); err != nil {
		log.Fatalf("upload failed: %v", err)
	}
	if err := download(fileName); err != nil {
		log.Fatalf("download failed: %v", err)
	}
}

func upload(fileName string) error {
	uploader, err := transfer.NewUploader(context.Background(), nil, []*node.ZgsClient{}, common.LogOption{
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

	_, _, err = uploader.SplitableUpload(context.Background(), file, 10, transfer.UploadOption{})
	if err != nil {
		return err
	}

	// if _, _, err := uploader.Upload(context.Background(), file); err != nil {
	// 	return err
	// }

	return nil
}

func download(fileName string) error {
	downloader, err := transfer.NewDownloader([]*node.ZgsClient{}, common.LogOption{
		Logger: logrus.StandardLogger(),
	})
	if err != nil {
		return err
	}

	if err := downloader.DownloadFragments(context.Background(), []string{"test.txt"}, fileName, false); err != nil {
		return err
	}

	// if err := downloader.Download(context.Background(), "test.txt", fileName, false); err != nil {
	// 	return err
	// }

	return nil
}
