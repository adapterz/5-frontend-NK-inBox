import { useState } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import AWS from "aws-sdk";
import sha256 from "crypto-js/sha256";
import styles from "./ModalForm.module.scss";
import closePic from "../../public/close.svg";
import FormList from "./ModalFormList";

export default function ModalForm(props: { closeModal: Function }) {
  // 파일 업로드 진행 상황을 확인할 수 있는 progress bar를 위한 State
  const [progress, setProgress] = useState(0);
  // 업로드된 파일의 key
  const [fileKey, setFileKey] = useState("");

  // S3 접근을 위한 AWS 계정 설정
  AWS.config.update({
    accessKeyId: process.env.NEXT_PUBLIC_ACCESS_KEY,
    secretAccessKey: process.env.NEXT_PUBLIC_SECRET_KEY,
  });

  // S3의 버켓 접근
  const s3 = new AWS.S3({
    params: { Bucket: process.env.NEXT_PUBLIC_BUCKET_NAME },
    region: process.env.NEXT_PUBLIC_REGION,
  });

  // dropzone에 들어온 파일을 받는 함수
  const onDrop = (files: any) => {
    const acceptedFiles = files[0];
    setFileKey(
      `${sha256(acceptedFiles.name).toString()}.${acceptedFiles.type.substring(6)}`
    );
    setProgress(0);
    uploadToBucket(acceptedFiles);
  };

  // S3 버켓에 파일을 올리는 함수
  const uploadToBucket = async (
    selectedFile: {
      type: string;
      name: string | CryptoJS.lib.WordArray;
    } | null
  ) => {
    if (!selectedFile) {
      return;
    }

    // 파일 확장자 정보 담기
    const params: any = {
      ACL: "public-read",
      Body: selectedFile,
      Bucket: process.env.NEXT_PUBLIC_BUCKET_NAME,
      Key:
        `${sha256(selectedFile.name).toString()}.${selectedFile.type.substring(6)}`,
    };

    // FIXME: params : No overload matches this call. 이라는 에러의 의미?
    s3.putObject(params)
      .on("httpUploadProgress", (event) => {
        setProgress(Math.round((event.loaded / event.total) * 100));
      })
      .send((error) => {
        if (error) console.log(error);
      });
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      "video/mp4": [],
      "video/avi": [],
      "video/webm": [],
      "video/wmv": [],
      "video/mov": [],
    },
  });

  return (
    <div className={styles.modalBackground}>
      <div className={styles.modalContainer}>
        <button
          className={styles.closeBtn}
          onClick={() => props.closeModal(false)}
        >
          <Image alt="Close" src={closePic} width={40} height={40} />
        </button>
        <h2 className={styles.modalTitle}>Upload your Box</h2>
        <form className={styles.formContainer}>
          {/* FIXME: 아래 부분 함수로 바꾸어 코드 정리하기 */}
          <section>
            <div
              {...getRootProps({
                className: `${styles.dropzoneContainer}
          ${isDragAccept && styles.dropzoneAccept}
          ${isDragReject && styles.dropzoneReject}`,
              })}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                isDragAccept ? (
                  <>
                    <div className={styles.dropzoneHeadTitle}>
                      You can upload!
                    </div>
                    <div className={styles.dropzoneSubTitle}>
                      Drop files here.
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.dropzoneHeadTitle}>
                      File type is not allowed
                    </div>
                    <div className={styles.dropzoneSubTitle}>
                      Please upload another file.
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className={styles.dropzoneHeadTitle}>File Upload</div>
                  <div className={styles.dropzoneSubTitle}>
                    Drop files here.
                  </div>
                </>
              )}
              <div className={styles.dropzoneProgress}>{progress}%</div>
            </div>
          </section>
          <FormList path={fileKey} />
        </form>
      </div>
    </div>
  );
}
