import { Icon } from '@blueprintjs/core'
import { SearchBar, SectionAction, SidePanel, SidePanelSection } from 'botpress/ui'
import { inject, observer } from 'mobx-react'
import React from 'react'

import { FileType } from '../../backend/typings'
import { HOOK_SIGNATURES } from '../../typings/hooks'

import FileStatus from './components/FileStatus'
import NameModal from './components/NameModal'
import NewFileModal from './components/NewFileModal'
import { RootStore, StoreDef } from './store'
import { EditorStore } from './store/editor'
import { EXAMPLE_FOLDER_LABEL } from './utils/tree'
import FileNavigator from './FileNavigator'

class PanelContent extends React.Component<Props> {
  private expandedNodes = {}

  state = {
    actionFiles: [],
    hookFiles: [],
    botConfigs: [],
    moduleConfigFiles: [],
    rawFiles: [],
    selectedNode: '',
    selectedFile: undefined,
    isMoveModalOpen: false,
    isCreateModalOpen: false,
    fileType: undefined,
    hookType: undefined
  }

  componentDidMount() {
    this.updateFolders()
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.files !== this.props.files) {
      this.updateFolders()
    }
  }

  addFiles(fileType: string, label: string, fileList: any[]) {
    const files = this.props.files[fileType]

    if (files && files.length) {
      fileList.push({ label, files })
    }
  }

  updateFolders() {
    if (!this.props.files) {
      return
    }

    const rawFiles = []
    this.addFiles('raw', `Data`, rawFiles)

    const actionFiles = []
    this.addFiles('bot.actions', `Bot (${window['BOT_NAME']})`, actionFiles)
    this.addFiles('global.actions', `Global`, actionFiles)

    const hookFiles = []
    this.addFiles('bot.hooks', `Bot (${window['BOT_NAME']})`, hookFiles)
    this.addFiles('global.hooks', 'Global', hookFiles)

    const botConfigFiles = []
    this.addFiles('bot.bot_config', `Current Bot`, botConfigFiles)
    this.addFiles('global.main_config', `Global`, botConfigFiles)

    const moduleConfigFiles = []
    this.addFiles('bot.module_config', `Current Bot`, moduleConfigFiles)
    this.addFiles('global.module_config', `Global`, moduleConfigFiles)

    this.addFiles('hook_example', EXAMPLE_FOLDER_LABEL, hookFiles)
    this.addFiles('action_example', EXAMPLE_FOLDER_LABEL, actionFiles)

    this.setState({ actionFiles, hookFiles, botConfigs: botConfigFiles, moduleConfigFiles, rawFiles })
  }

  updateNodeExpanded = (id: string, isExpanded: boolean) => {
    if (isExpanded) {
      this.expandedNodes[id] = true
    } else {
      delete this.expandedNodes[id]
    }
  }

  updateNodeSelected = (fullyQualifiedId: string) => {
    this.setState({ selectedNode: fullyQualifiedId })
  }

  hasPermission = (perm: string, isWrite?: boolean): boolean => {
    const { permissions } = this.props
    return permissions && permissions[perm] && permissions[perm][isWrite ? 'write' : 'read']
  }

  createFilePrompt(type: FileType, hookType?: string) {
    this.setState({ fileType: type, hookType, isCreateModalOpen: true })
  }

  renderSectionModuleConfig() {
    if (!this.hasPermission('global.module_config') && !this.hasPermission('bot.module_config')) {
      return null
    }

    return (
      <SidePanelSection label="Module Configurations">
        <FileNavigator
          id="moduleConfig"
          files={this.state.moduleConfigFiles}
          expandedNodes={this.expandedNodes}
          selectedNode={this.state.selectedNode}
          contextMenuType="moduleConfig"
          onNodeStateExpanded={this.updateNodeExpanded}
          onNodeStateSelected={this.updateNodeSelected}
        />
      </SidePanelSection>
    )
  }

  renderSectionConfig() {
    if (!this.hasPermission('global.main_config') || !this.hasPermission('bot.bot_config')) {
      return null
    }

    return (
      <SidePanelSection label="Configurations">
        <FileNavigator
          id="config"
          files={this.state.botConfigs}
          disableContextMenu
          expandedNodes={this.expandedNodes}
          selectedNode={this.state.selectedNode}
          onNodeStateExpanded={this.updateNodeExpanded}
          onNodeStateSelected={this.updateNodeSelected}
        />
      </SidePanelSection>
    )
  }

  renderSectionActions() {
    return (
      <SidePanelSection
        label={'Actions'}
        actions={[
          {
            id: 'btn-add-action',
            icon: <Icon icon="add" />,
            key: 'add',
            onClick: () => this.createFilePrompt('action')
          }
        ]}
      >
        <FileNavigator
          id="actions"
          files={this.state.actionFiles}
          expandedNodes={this.expandedNodes}
          selectedNode={this.state.selectedNode}
          onNodeStateExpanded={this.updateNodeExpanded}
          onNodeStateSelected={this.updateNodeSelected}
        />
      </SidePanelSection>
    )
  }

  renderSectionHooks() {
    if (!this.hasPermission('global.hooks') && !this.hasPermission('bot.hooks')) {
      return null
    }

    return (
      <SidePanelSection label={'Hooks'} actions={this._buildHooksActions(this.hasPermission('global.hooks', true))}>
        <FileNavigator
          id="hooks"
          files={this.state.hookFiles}
          expandedNodes={this.expandedNodes}
          selectedNode={this.state.selectedNode}
          onNodeStateExpanded={this.updateNodeExpanded}
          onNodeStateSelected={this.updateNodeSelected}
        />
      </SidePanelSection>
    )
  }

  renderSectionRaw() {
    const createFile = async (name: string) => {
      return this.props.editor.openFile({ name, location: name, content: ' ', type: 'raw' })
    }

    return (
      <SidePanelSection
        label="Raw File Editor"
        actions={[
          {
            id: 'btn-add-action',
            icon: <Icon icon="add" />,
            key: 'add',
            onClick: () => this.setState({ selectedFile: undefined, isMoveModalOpen: true })
          }
        ]}
      >
        <FileNavigator
          id="raw"
          files={this.state.rawFiles}
          expandedNodes={this.expandedNodes}
          selectedNode={this.state.selectedNode}
          onNodeStateExpanded={this.updateNodeExpanded}
          onNodeStateSelected={this.updateNodeSelected}
          moveFile={file => this.setState({ selectedFile: file, isMoveModalOpen: true })}
        />
        <NameModal
          isOpen={this.state.isMoveModalOpen}
          toggle={() => this.setState({ isMoveModalOpen: !this.state.isMoveModalOpen })}
          createFile={createFile}
          renameFile={this.props.store.renameFile}
          selectedFile={this.state.selectedFile}
          files={this.props.files}
        />
      </SidePanelSection>
    )
  }

  _buildHooksActions(showGlobalHooks: boolean) {
    const hooks = Object.keys(HOOK_SIGNATURES).map(hookType => ({
      id: hookType,
      label: hookType
        .split('_')
        .map(x => x.charAt(0).toUpperCase() + x.slice(1))
        .join(' '),
      onClick: () => this.createFilePrompt('hook', hookType)
    }))

    const items = [
      {
        label: 'Event Hooks',
        items: hooks.filter(x =>
          [
            'before_incoming_middleware',
            'after_incoming_middleware',
            'before_outgoing_middleware',
            'after_event_processed',
            'before_suggestions_election',
            'before_session_timeout'
          ].includes(x.id)
        )
      },
      {
        label: 'Bot Hooks',
        items: hooks.filter(x =>
          ['after_bot_mount', 'after_bot_unmount', 'before_bot_import', 'on_bot_error'].includes(x.id)
        )
      }
    ]

    if (showGlobalHooks) {
      items.push(
        {
          label: 'General Hooks',
          items: hooks.filter(x => ['after_server_start', 'on_incident_status_changed'].includes(x.id))
        },
        {
          label: 'Pipeline Hooks',
          items: hooks.filter(x => ['on_stage_request', 'after_stage_changed'].includes(x.id))
        }
      )
    }

    return [
      {
        id: 'btn-add-hook',
        icon: <Icon icon="add" />,
        key: 'add',
        items
      }
    ]
  }

  render() {
    return (
      <SidePanel>
        {this.props.editor.isOpenedFile && this.props.editor.isDirty ? (
          <FileStatus />
        ) : (
          <React.Fragment>
            <SearchBar icon="filter" placeholder="Filter files" onChange={this.props.setFilenameFilter} />
            {this.props.store.useRawEditor ? (
              this.renderSectionRaw()
            ) : (
              <React.Fragment>
                {this.renderSectionActions()}
                {this.renderSectionHooks()}
                {this.renderSectionConfig()}
                {this.renderSectionModuleConfig()}
              </React.Fragment>
            )}
          </React.Fragment>
        )}
        <NewFileModal
          isOpen={this.state.isCreateModalOpen}
          toggle={() => this.setState({ isCreateModalOpen: !this.state.isCreateModalOpen })}
          openFile={this.props.editor.openFile}
          selectedType={this.state.fileType}
          selectedHookType={this.state.hookType}
          hasPermission={this.hasPermission}
          files={this.props.files}
        />
      </SidePanel>
    )
  }
}

export default inject(({ store }: { store: RootStore }) => ({
  store,
  editor: store.editor,
  files: store.files,
  isDirty: store.editor.isDirty,
  setFilenameFilter: store.setFilenameFilter,
  createFilePrompt: store.createFilePrompt,
  permissions: store.permissions
}))(observer(PanelContent))

type Props = { store?: RootStore; editor?: EditorStore } & Pick<
  StoreDef,
  'files' | 'permissions' | 'createFilePrompt' | 'setFilenameFilter'
>
