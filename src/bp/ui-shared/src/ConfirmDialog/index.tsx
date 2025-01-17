import { Button, Classes, Dialog, Intent } from '@blueprintjs/core'
import React, { FC } from 'react'
import ReactDOM from 'react-dom'

import { ConfirmDialogOptions, ConfirmDialogProps } from '../Interface/typings'

import styles from './style.scss'

const ConfirmDialogComponent: FC<ConfirmDialogProps> = props => {
  const onAccept = () => {
    removeDialog()

    if (props.accept) {
      props.accept()
    }

    props.resolve(true)
  }

  const onDecline = () => {
    removeDialog()

    if (props.decline) {
      props.decline()
    }

    props.resolve(false)
  }

  return (
    <Dialog
      title={props.title}
      icon="warning-sign"
      usePortal={false}
      enforceFocus={false}
      isOpen={true}
      onClose={onDecline}
      transitionDuration={0}
      canOutsideClickClose={false}
    >
      <div className={Classes.DIALOG_BODY}>{props.message}</div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            id="confirm-dialog-decline"
            className={Classes.BUTTON}
            type="button"
            onClick={onDecline}
            text={props.declineLabel}
            tabIndex={2}
            intent={Intent.NONE}
          />
          <Button
            id="confirm-dialog-accept"
            className={Classes.BUTTON}
            type="button"
            onClick={onAccept}
            text={props.acceptLabel}
            tabIndex={3}
            intent={Intent.PRIMARY}
          />
        </div>
      </div>
    </Dialog>
  )
}

ConfirmDialogComponent.defaultProps = {
  title: 'Confirmation Needed',
  acceptLabel: 'OK',
  declineLabel: 'Cancel',
  accept: () => {},
  decline: () => {}
}

const confirmDialog = (message: string, options: ConfirmDialogOptions): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    addDialog({ message, ...options }, resolve)
  })
}

export default confirmDialog

function addDialog(props, resolve) {
  const body = document.getElementsByTagName('body')[0]
  const div = document.createElement('div')

  div.setAttribute('id', 'confirmDialog-container')
  div.setAttribute('class', styles.ConfirmDialogContainer)
  body.appendChild(div)

  ReactDOM.render(<ConfirmDialogComponent {...props} resolve={resolve} />, div)
}

function removeDialog() {
  const div = document.getElementById('confirmDialog-container') as HTMLElement
  const body = document.getElementsByTagName('body')[0]

  body.removeChild(div)
}
