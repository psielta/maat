"use client"

import * as React from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin"
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  type TextNode,
} from "lexical"
import { createPortal } from "react-dom"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  getMentionDisplayName,
  type MentionableUser,
} from "@/lib/board-mentionable-users"
import { $createMentionNode } from "@/lib/lexical/mention-node"
import { cn } from "@/lib/utils"

class MentionTypeaheadOption extends MenuOption {
  user: MentionableUser

  constructor(user: MentionableUser) {
    super(user.id)
    this.user = user
  }
}

function MentionMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
  option: MentionTypeaheadOption
}) {
  const label = getMentionDisplayName(option.user)

  return (
    <button
      key={option.key}
      type="button"
      tabIndex={-1}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={`mention-option-${index}`}
      className={cn(
        "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors",
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/70"
      )}
      onMouseEnter={onMouseEnter}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <Avatar className="h-6 w-6">
        {option.user.image && (
          <AvatarImage src={option.user.image} alt={label} />
        )}
        <AvatarFallback className="text-[10px]">
          {label.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium">{label}</p>
        {option.user.name && option.user.email && (
          <p className="truncate text-xs text-muted-foreground">
            {option.user.email}
          </p>
        )}
      </div>
    </button>
  )
}

function filterOptions(
  options: MentionTypeaheadOption[],
  queryString: string | null
) {
  const query = queryString?.trim().toLowerCase() ?? ""

  if (!query) {
    return options
  }

  return options.filter((option) => {
    const label = getMentionDisplayName(option.user).toLowerCase()
    const email = option.user.email?.toLowerCase() ?? ""
    return label.includes(query) || email.includes(query)
  })
}

export function MentionsPlugin({
  mentionableUsers,
}: {
  mentionableUsers: MentionableUser[]
}) {
  const [editor] = useLexicalComposerContext()
  const [queryString, setQueryString] = React.useState<string | null>(null)

  const checkMatch = useBasicTypeaheadTriggerMatch("@", {
    minLength: 0,
    maxLength: 40,
    punctuation:
      "\\.,\\+\\*\\?\\$\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%'\"~=<>_:;",
  })

  const options = React.useMemo(
    () => mentionableUsers.map((user) => new MentionTypeaheadOption(user)),
    [mentionableUsers]
  )

  const filteredOptions = React.useMemo(
    () => filterOptions(options, queryString),
    [options, queryString]
  )

  const onSelectOption = React.useCallback(
    (
      selectedOption: MentionTypeaheadOption,
      nodeToReplace: TextNode | null,
      closeMenu: () => void
    ) => {
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection) || !nodeToReplace) {
          return
        }

        const mentionNode = $createMentionNode(
          selectedOption.user.id,
          getMentionDisplayName(selectedOption.user)
        )
        nodeToReplace.replace(mentionNode)
        mentionNode.insertAfter($createTextNode(" "))
        mentionNode.selectNext()
      })

      closeMenu()
    },
    [editor]
  )

  if (options.length === 0) {
    return null
  }

  return (
    <LexicalTypeaheadMenuPlugin<MentionTypeaheadOption>
      anchorClassName="typeahead-menu-anchor pointer-events-none fixed z-[200]"
      onQueryChange={setQueryString}
      onClose={() => setQueryString(null)}
      onSelectOption={onSelectOption}
      triggerFn={checkMatch}
      options={filteredOptions}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex, options: menuOptions }
      ) => {
        if (!anchorElementRef.current || menuOptions.length === 0) {
          return null
        }

        return createPortal(
          <div className="pointer-events-auto z-[200] max-h-56 min-w-[220px] overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {menuOptions.map((option, index) => (
              <MentionMenuItem
                key={option.key}
                index={index}
                isSelected={selectedIndex === index}
                onClick={() => {
                  setHighlightedIndex(index)
                  selectOptionAndCleanUp(option)
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                option={option}
              />
            ))}
          </div>,
          anchorElementRef.current
        )
      }}
    />
  )
}