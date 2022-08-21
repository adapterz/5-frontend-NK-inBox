import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import AWS from 'aws-sdk'
import sha256 from 'crypto-js/sha256'
import styles from './ModalForm.module.scss'

const Dropzone = ({ setFileKey }: { setFileKey : Function }) => {
  // 파일 업로드 진행 상황을 확인할 수 있는 progress bar를 위한 State
  const [progress, setProgress] = useState(0)

  // S3 접근을 위한 AWS 계정 설정
  AWS.config.update({
    accessKeyId: process.env.NEXT_PUBLIC_ACCESS_KEY,
    secretAccessKey: process.env.NEXT_PUBLIC_SECRET_KEY,
  })

  // S3의 버켓 접근
  const s3 = new AWS.S3({
    params: { Bucket: process.env.NEXT_PUBLIC_BUCKET_NAME },
    region: process.env.NEXT_PUBLIC_REGION,
  })

  interface DroppedFile {
    type: string
    name: string | CryptoJS.lib.WordArray
  }

  // dropzone에 들어온 파일을 받는 함수
  const onDrop = (files: Array<DroppedFile>) => {
    const acceptedFiles = files[0]
    setFileKey(`${sha256(acceptedFiles.name).toString()}.${acceptedFiles.type.substring(6)}`)
    setProgress(0)
    uploadToBucket(acceptedFiles)
  }

  // S3 버켓에 파일을 올리는 함수
  const uploadToBucket = async (selectedFile: DroppedFile | null) => {
    if (!selectedFile) {
      return
    }

    interface FileParams {
      ACL: string
      Body: DroppedFile
      Bucket: string
      Key: string
    }

    // 파일 확장자 정보 담기
    const params: FileParams = {
      ACL: 'public-read',
      Body: selectedFile,
      // ! means 'this value will not be undefined'
      Bucket: process.env.NEXT_PUBLIC_BUCKET_NAME!,
      Key: `${sha256(selectedFile.name).toString()}.${selectedFile.type.substring(6)}`,
    }

    s3.putObject(params)
      .on('httpUploadProgress', event => {
        setProgress(Math.round((event.loaded / event.total) * 100))
      })
      .send(error => {
        if (error) console.log(error)
      })
  }

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': [],
      'video/avi': [],
      'video/webm': [],
      'video/wmv': [],
      'video/mov': [],
    },
  })

  // drag된 파일이 업로드 가능한 확장자인지 아닌지를 판별하여 UI에 반영하는 함수
  const isDragAcceptHandler = (isDragAccept: boolean) => {
    if (isDragAccept) {
      return (
        <>
          <div className={styles.dropzoneHeadTitle}>You can upload!</div>
          <div className={styles.dropzoneSubTitle}>Drop files here.</div>
        </>
      )
    }
    return (
      <>
        <div className={styles.dropzoneHeadTitle}>File type is not allowed</div>
        <div className={styles.dropzoneSubTitle}>Please upload another file.</div>
      </>
    )
  }

  // 파일이 drag된 상태인지 아닌지에 따라 UI를 변경하는 함수
  const isDragActiveHandler = (isDragActive: boolean) => {
    if (isDragActive) {
      return isDragAcceptHandler(isDragAccept)
    }
    return (
      <>
        <div className={styles.dropzoneHeadTitle}>File Upload</div>
        <div className={styles.dropzoneSubTitle}>Drop files here.</div>
      </>
    )
  }

  return (
    <section>
      <div
        {...getRootProps({
          className: `${styles.dropzoneContainer}
          ${isDragAccept && styles.dropzoneAccept}
          ${isDragReject && styles.dropzoneReject}`,
        })}
      >
        <input {...getInputProps()} />
        {isDragActiveHandler(isDragActive)}
        <div className={styles.dropzoneProgress}>{progress}%</div>
      </div>
    </section>
  )
}

export default Dropzone