/**
 * @author Nithin
 */

// Role Tree View: every role as a row, child roles indented under their parent.

import { useRef, useState } from 'react';

// Colors for tree level lines
const treeColors = ['#EF4444', '#F97316', '#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#06B6D4'];

function getColorForLevel(level) {
  return treeColors[level % treeColors.length];
}

function buildTree(roles) {
  const map = {};
  const roots = [];

  roles.forEach((r) => {
    map[r._id] = { ...r, children: [] };
  });

  roles.forEach((r) => {
    if (r.parentId && map[r.parentId]) {
      map[r.parentId].children.push(map[r._id]);
    } else {
      roots.push(map[r._id]);
    }
  });

  return roots;
}

const roundButtonStyle = { width: '28px', height: '28px', lineHeight: '28px' };
const buttonIconStyle = { fontSize: '11px' };

function RoleTreeNode({ node, level, userCounts, userCan, onAddChild, onEdit, onRemove }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const childrenRef = useRef(null);

  const color = getColorForLevel(level);
  const hasChildren = node.children && node.children.length > 0;
  const indent = level * 28;
  const userCount = userCounts[node._id] === undefined ? 0 : userCounts[node._id];

  // Tree toggle expand/collapse
  const handleToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const $children = $(childrenRef.current);

    if ($children.is(':visible')) {
      $children.slideUp(200);
      setIsExpanded(false);
    } else {
      $children.slideDown(200);
      setIsExpanded(true);
    }
  };

  const handleAddChild = (event) => {
    event.preventDefault();
    onAddChild(node._id, node.name);
  };

  const handleEdit = (event) => {
    event.preventDefault();
    onEdit(node._id);
  };

  const handleRemove = (event) => {
    event.preventDefault();
    onRemove(node._id, node.name);
  };

  return (
    <div className="tree-node" data-id={node._id} data-level={level}>
      {/* Role row */}
      <div className="d-flex align-items-center py-2 tree-role-item" style={{ paddingLeft: indent + 'px' }}>

        {/* Tree line connector */}
        {level > 0 && (
          <div className="d-flex align-items-center me-2">
            <div style={{ width: '20px', height: '2px', background: color }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }}></div>
          </div>
        )}

        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button className="btn btn-sm p-0 me-1 tree-toggle" data-id={node._id} style={{ width: '20px', height: '20px', lineHeight: '20px' }} onClick={handleToggle}>
            <i className={'fa ' + (isExpanded ? 'fa-chevron-down' : 'fa-chevron-right') + ' fa-xs text-muted'}></i>
          </button>
        ) : (level > 0 && (
          <div style={{ width: '20px' }} className="me-1"></div>
        ))}

        {/* Role name bar */}
        <div className="flex-grow-1 d-flex align-items-center rounded px-3 py-2 tree-role-bar"
          style={{ background: '#fff', border: '1px solid #e5e7eb', minHeight: '40px', cursor: 'pointer' }}
          data-id={node._id}>

          {level === 0 ? (
            <span className="fw-bold text-primary">{node.name}</span>
          ) : (
            <span className="fw-medium">{node.name}</span>
          )}

          {/* User count badge */}
          <span className="badge bg-label-info ms-2 small"><i className="fa fa-users me-1"></i><span className={'tree-user-count-' + node._id}>{userCount}</span></span>

          {/* Description */}
          {node.description && (
            <small className="text-muted ms-3 d-none d-md-inline tree-role-desc">{node.description}</small>
          )}
        </div>

        {/* Action buttons */}
        <div className="d-flex align-items-center ms-2 flex-shrink-0">

          {/* Add child button (requires role_create permission) */}
          {userCan('role_create') && (
            <button className="btn btn-sm btn-outline-primary rounded-circle tree-add-child p-0 me-1" data-id={node._id} data-name={node.name} title="Add child role" style={roundButtonStyle} onClick={handleAddChild}>
              <i className="fa fa-plus" style={buttonIconStyle}></i>
            </button>
          )}

          {/* Edit button (requires role_update permission) */}
          {userCan('role_update') && (
            <button className="btn btn-sm btn-outline-secondary rounded-circle ic-edit-button p-0 me-1" id={node._id} title="Edit" style={roundButtonStyle} onClick={handleEdit}>
              <i className="fa fa-pencil" style={buttonIconStyle}></i>
            </button>
          )}

          {/* Delete button (requires role_delete permission, hidden for Admin role) */}
          {userCan('role_delete') && (
            node.name !== 'Admin' ? (
              <button className="btn btn-sm btn-outline-danger rounded-circle remove p-0" id={node._id} data-name={node.name} title="Delete" style={roundButtonStyle} onClick={handleRemove}>
                <i className="fa fa-trash" style={buttonIconStyle}></i>
              </button>
            ) : (
              <div style={{ width: '28px', height: '28px', display: 'inline-block' }}></div>
            )
          )}
        </div>
      </div>

      {/* Children container */}
      {hasChildren && (
        <div className="tree-children" data-parent={node._id} style={{ position: 'relative' }} ref={childrenRef}>
          {/* Vertical line */}
          <div style={{ position: 'absolute', left: (indent + 14) + 'px', top: 0, bottom: '12px', width: '2px', background: getColorForLevel(level + 1) }}></div>
          {node.children.map((child) => (
            <RoleTreeNode key={child._id} node={child} level={level + 1} userCounts={userCounts} userCan={userCan}
              onAddChild={onAddChild} onEdit={onEdit} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * @param roles        the roles of role.getTreeList (null = nothing to show yet)
 * @param userCounts   { roleId: number of users }
 * @param userCan      userCan() of useAuth()
 * @param onAddChild   (roleId, roleName) => ...
 * @param onEdit       (roleId) => ...
 * @param onRemove     (roleId, roleName) => ...
 */
export default function RoleTree({ roles, userCounts, userCan, onAddChild, onEdit, onRemove }) {
  const tree = roles ? buildTree(roles) : null;

  return (
    <div id="roleTreeContainer">
      {tree && tree.length === 0 && (
        <div className="text-center py-5"><i className="fa fa-sitemap text-muted" style={{ fontSize: '48px' }}></i><p className="text-muted mt-3">No roles found</p></div>
      )}
      {tree && tree.map((node) => (
        <RoleTreeNode key={node._id} node={node} level={0} userCounts={userCounts} userCan={userCan}
          onAddChild={onAddChild} onEdit={onEdit} onRemove={onRemove} />
      ))}
    </div>
  );
}
